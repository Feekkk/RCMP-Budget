import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const APPROVED_BUDGET_STATUS_ID = 12;

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export type AccountType = "CAPEX" | "OPEX";

export type FinanceAccountSummary = {
  accountType: AccountType;
  credited: number;
  debited: number;
  balance: number;
};

export type FinanceOverview = {
  budgetYear: number;
  totalAllocation: number;
  totalSpent: number;
  totalBalance: number;
  accounts: FinanceAccountSummary[];
};

type AccountRow = {
  account_id: number;
  account_type: string;
  account_balance: string | number;
  credited: string | number;
  debited: string | number;
};

function requireHod(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("Please sign in to manage your department budget.");
  }
  if (user.roleName !== "HOD") {
    throw new Error("Only HOD accounts can manage the department budget.");
  }
  if (user.departmentId == null) {
    throw new Error(
      "Your account has no department. Ask an admin to assign one.",
    );
  }
  return user;
}

type ApprovedBudgetRow = {
  budget_type: string;
  total_amount: string | number;
};

async function loadOverview(
  departmentId: number,
  budgetYear: number,
): Promise<FinanceOverview> {
  const { query } = await import("@/server/db");

  const rows = await query<AccountRow[]>(
    `SELECT
       fa.account_id,
       fa.account_type,
       fa.account_balance,
       COALESCE(SUM(CASE WHEN fe.entry_type = 'IN' THEN fe.amount END), 0) AS credited,
       COALESCE(SUM(CASE WHEN fe.entry_type = 'OUT' THEN fe.amount END), 0) AS debited
     FROM finance_accounts fa
     LEFT JOIN finance_account_entries fe ON fe.account_id = fa.account_id
     WHERE fa.department_id = ? AND fa.budget_year = ?
     GROUP BY fa.account_id, fa.account_type, fa.account_balance`,
    [departmentId, budgetYear],
  );

  const approvedBudgets = await query<ApprovedBudgetRow[]>(
    `SELECT
       yb.budget_type,
       COALESCE(SUM(yb.budget_amount), 0) AS total_amount
     FROM yearly_budgets yb
     INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
     INNER JOIN users u ON u.user_id = yb.created_by
     WHERE u.department_id = ?
       AND yb.budget_year = ?
       AND qs.status_name = 'approved budget'
     GROUP BY yb.budget_type`,
    [departmentId, budgetYear],
  );

  const accounts: FinanceAccountSummary[] = (["CAPEX", "OPEX"] as const).map(
    (accountType) => {
      const row = rows.find((item) => item.account_type === accountType);
      const approved = approvedBudgets.find(
        (item) => item.budget_type === accountType,
      );
      const credited = row ? Number(row.credited) : 0;
      const manualOut = row ? Number(row.debited) : 0;
      const approvedOut = approved ? Number(approved.total_amount) : 0;
      const debited = manualOut + approvedOut;
      return {
        accountType,
        credited,
        debited,
        balance: credited - debited,
      };
    },
  );

  const totalAllocation = accounts.reduce((sum, a) => sum + a.credited, 0);
  const totalSpent = accounts.reduce((sum, a) => sum + a.debited, 0);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return { budgetYear, totalAllocation, totalSpent, totalBalance, accounts };
}

export const getHodFinanceOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinanceOverview> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);
    return loadOverview(user.departmentId as number, new Date().getFullYear());
  },
);

export const recordFinanceEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accountType: z.enum(["CAPEX", "OPEX"]),
      entryType: z.enum(["IN", "OUT"]),
      amount: z.number().positive().max(99999999),
      remarks: z.string().max(255).optional(),
    }),
  )
  .handler(async ({ data }): Promise<FinanceOverview> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);
    const departmentId = user.departmentId as number;
    const budgetYear = new Date().getFullYear();

    const { query } = await import("@/server/db");

    const existing = await query<{ account_id: number }[]>(
      `SELECT account_id
       FROM finance_accounts
       WHERE department_id = ? AND account_type = ? AND budget_year = ?
       LIMIT 1`,
      [departmentId, data.accountType, budgetYear],
    );

    let accountId: number;

    if (existing[0]) {
      accountId = existing[0].account_id;
    } else {
      const result = await query<{ insertId: number }>(
        `INSERT IGNORE INTO finance_accounts
           (department_id, status_id, account_name, account_type, budget_year, account_balance, edited_by)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
          departmentId,
          APPROVED_BUDGET_STATUS_ID,
          `${data.accountType} ${budgetYear}`,
          data.accountType,
          budgetYear,
          user.userId,
        ],
      );
      if (result.insertId) {
        accountId = result.insertId;
      } else {
        const retry = await query<{ account_id: number }[]>(
          `SELECT account_id
           FROM finance_accounts
           WHERE department_id = ? AND account_type = ? AND budget_year = ?
           LIMIT 1`,
          [departmentId, data.accountType, budgetYear],
        );
        if (!retry[0]) {
          throw new Error("Could not open the account. Please try again.");
        }
        accountId = retry[0].account_id;
      }
    }

    const signedAmount = data.entryType === "IN" ? data.amount : -data.amount;

    if (data.entryType === "OUT") {
      const overview = await loadOverview(departmentId, budgetYear);
      const account = overview.accounts.find(
        (item) => item.accountType === data.accountType,
      );
      const remaining = account?.balance ?? 0;
      if (data.amount > remaining) {
        throw new Error(
          "Not enough balance in this account. Enter a smaller amount.",
        );
      }
    }

    await query(
      `INSERT INTO finance_account_entries (account_id, entry_type, amount, remarks, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [accountId, data.entryType, data.amount, data.remarks ?? null, user.userId],
    );

    await query(
      `UPDATE finance_accounts
       SET account_balance = account_balance + ?, edited_by = ?
       WHERE account_id = ?`,
      [signedAmount, user.userId, accountId],
    );

    return loadOverview(departmentId, budgetYear);
  });

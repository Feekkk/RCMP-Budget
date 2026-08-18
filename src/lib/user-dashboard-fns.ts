import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/middleware";

export type AccountSplit = {
  accountType: "CAPEX" | "OPEX";
  credited: number;
  debited: number;
  balance: number;
};

export type MonthlySpend = {
  month: string;
  amount: number;
};

export type UserDashboardStats = {
  budgetYear: number;
  approvedSpent: number;
  spent: number;
  allocation: number;
  remaining: number;
  lastYearAllocation: number;
  thisMonthSpent: number;
  lastMonthSpent: number;
  pendingCount: number;
  departmentName: string | null;
  staffId: number | null;
  displayName: string;
  monthlySpend: MonthlySpend[];
  accounts: AccountSplit[];
};

type SumRow = {
  total: string | number;
};

type TypeSumRow = {
  budget_type: string;
  total: string | number;
};

type AccountRow = {
  account_type: string;
  credited: string | number;
  debited: string | number;
};

type MonthRow = {
  month_key: string;
  total: string | number;
};

function isPendingQuotation(statusName: string) {
  if (statusName.includes("rejected")) return false;
  if (
    statusName === "approved_hod" ||
    statusName === "approved_ceo" ||
    statusName === "completed"
  ) {
    return false;
  }
  return true;
}

function isPendingBudget(statusName: string) {
  if (statusName.includes("rejected")) return false;
  if (statusName.includes("approved") || statusName === "completed") {
    return false;
  }
  return true;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function displayNameFor(email: string, designation: string | null) {
  const titled = designation?.trim();
  if (titled) return titled;
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._]/g, " ");
}

export const getUserDashboardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserDashboardStats> => {
    const { user } = context;
    const now = new Date();
    const budgetYear = now.getFullYear();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const rangeStartSql = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-01`;

    const { query } = await import("@/server/db");

    let allocation = 0;
    let lastYearAllocation = 0;
    let manualOut = 0;
    let approvedSpent = 0;
    const accounts: AccountSplit[] = [];

    if (user.departmentId != null) {
      const accountRows = await query<AccountRow[]>(
        `SELECT
           fa.account_type,
           COALESCE(SUM(CASE WHEN fe.entry_type = 'IN' THEN fe.amount END), 0) AS credited,
           COALESCE(SUM(CASE WHEN fe.entry_type = 'OUT' THEN fe.amount END), 0) AS debited
         FROM finance_accounts fa
         LEFT JOIN finance_account_entries fe ON fe.account_id = fa.account_id
         WHERE fa.department_id = ? AND fa.budget_year = ?
         GROUP BY fa.account_type`,
        [user.departmentId, budgetYear],
      );

      const approvedRows = await query<TypeSumRow[]>(
        `SELECT yb.budget_type, COALESCE(SUM(yb.budget_amount), 0) AS total
         FROM yearly_budgets yb
         INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
         INNER JOIN users u ON u.user_id = yb.created_by
         WHERE u.department_id = ?
           AND yb.budget_year = ?
           AND qs.status_name = 'approved budget'
         GROUP BY yb.budget_type`,
        [user.departmentId, budgetYear],
      );

      for (const accountType of ["CAPEX", "OPEX"] as const) {
        const row = accountRows.find((item) => item.account_type === accountType);
        const approved = approvedRows.find(
          (item) => item.budget_type === accountType,
        );
        const credited = row ? Number(row.credited) : 0;
        const out = row ? Number(row.debited) : 0;
        const approvedOut = approved ? Number(approved.total) : 0;
        const debited = out + approvedOut;
        accounts.push({
          accountType,
          credited,
          debited,
          balance: credited - debited,
        });
        allocation += credited;
        manualOut += out;
        approvedSpent += approvedOut;
      }

      const lastYearRows = await query<SumRow[]>(
        `SELECT COALESCE(SUM(CASE WHEN fe.entry_type = 'IN' THEN fe.amount END), 0) AS total
         FROM finance_accounts fa
         LEFT JOIN finance_account_entries fe ON fe.account_id = fa.account_id
         WHERE fa.department_id = ? AND fa.budget_year = ?`,
        [user.departmentId, budgetYear - 1],
      );
      lastYearAllocation = Number(lastYearRows[0]?.total ?? 0);
    }

    const spent = manualOut + approvedSpent;
    const remaining = allocation - spent;

    const quotationMonthRows = await query<MonthRow[]>(
      `SELECT DATE_FORMAT(q.created_at, '%Y-%m') AS month_key,
              COALESCE(SUM(qi.item_price * qi.item_quantity), 0) AS total
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
       WHERE q.user_id = ?
         AND q.created_at >= ?
         AND qs.status_name NOT LIKE '%rejected%'
       GROUP BY DATE_FORMAT(q.created_at, '%Y-%m')`,
      [user.userId, rangeStartSql],
    );

    const budgetMonthRows = await query<MonthRow[]>(
      `SELECT DATE_FORMAT(yb.created_at, '%Y-%m') AS month_key,
              COALESCE(SUM(yb.budget_amount), 0) AS total
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       WHERE yb.created_by = ?
         AND yb.created_at >= ?
         AND qs.status_name NOT LIKE '%rejected%'
       GROUP BY DATE_FORMAT(yb.created_at, '%Y-%m')`,
      [user.userId, rangeStartSql],
    );

    const monthTotals = new Map<string, number>();
    for (const row of [...quotationMonthRows, ...budgetMonthRows]) {
      monthTotals.set(
        row.month_key,
        (monthTotals.get(row.month_key) ?? 0) + Number(row.total),
      );
    }

    const monthlySpend: MonthlySpend[] = [];
    for (let offset = 3; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = monthKey(date);
      monthlySpend.push({
        month: date.toLocaleDateString("en-GB", { month: "short" }),
        amount: monthTotals.get(key) ?? 0,
      });
    }

    const quotationRows = await query<{ status_name: string }[]>(
      `SELECT qs.status_name
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       WHERE q.user_id = ?`,
      [user.userId],
    );

    const budgetRows = await query<{ status_name: string }[]>(
      `SELECT qs.status_name
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       WHERE yb.created_by = ?`,
      [user.userId],
    );

    const pendingCount =
      quotationRows.filter((row) => isPendingQuotation(row.status_name)).length +
      budgetRows.filter((row) => isPendingBudget(row.status_name)).length;

    return {
      budgetYear,
      approvedSpent,
      spent,
      allocation,
      remaining,
      lastYearAllocation,
      thisMonthSpent: monthlySpend[3]?.amount ?? 0,
      lastMonthSpent: monthlySpend[2]?.amount ?? 0,
      pendingCount,
      departmentName: user.department,
      staffId: user.staffId,
      displayName: displayNameFor(user.email, user.designation),
      monthlySpend,
      accounts,
    };
  });

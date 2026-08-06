import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export type UserDashboardStats = {
  budgetYear: number;
  approvedSpent: number;
  allocation: number;
  pendingCount: number;
};

type SumRow = {
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

export const getUserDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserDashboardStats> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view your dashboard.");
    }

    const budgetYear = new Date().getFullYear();
    const { query } = await import("@/server/db");

    let approvedSpent = 0;
    let allocation = 0;

    if (user.departmentId != null) {
      const approvedRows = await query<SumRow[]>(
        `SELECT COALESCE(SUM(yb.budget_amount), 0) AS total
         FROM yearly_budgets yb
         INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
         INNER JOIN users u ON u.user_id = yb.created_by
         WHERE u.department_id = ?
           AND yb.budget_year = ?
           AND qs.status_name = 'approved budget'`,
        [user.departmentId, budgetYear],
      );
      approvedSpent = Number(approvedRows[0]?.total ?? 0);

      const allocationRows = await query<SumRow[]>(
        `SELECT COALESCE(SUM(CASE WHEN fe.entry_type = 'IN' THEN fe.amount END), 0) AS total
         FROM finance_accounts fa
         LEFT JOIN finance_account_entries fe ON fe.account_id = fa.account_id
         WHERE fa.department_id = ? AND fa.budget_year = ?`,
        [user.departmentId, budgetYear],
      );
      allocation = Number(allocationRows[0]?.total ?? 0);
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
      allocation,
      pendingCount,
    };
  },
);

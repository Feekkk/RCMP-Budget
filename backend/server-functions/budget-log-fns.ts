import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, roleMiddleware } from "@backend/core/middleware";
import {
  parseSnapshot,
  type BudgetAction,
  type BudgetSnapshot,
} from "@backend/core/budget-action-log";
import type { AuthUser } from "@/lib/auth";

export type BudgetActionLog = {
  id: number;
  budgetId: number | null;
  budgetRef: string;
  budgetYear: number;
  budgetType: "OPEX" | "CAPEX";
  action: BudgetAction;
  actorEmail: string;
  ownerEmail: string;
  remarks: string | null;
  oldValues: BudgetSnapshot;
  newValues: BudgetSnapshot | null;
  date: string;
  createdAt: string;
};

type LogRow = {
  log_id: number;
  budget_id: number | null;
  budget_ref: string;
  budget_year: number;
  budget_type: string;
  action: BudgetAction;
  remarks: string | null;
  old_values: unknown;
  new_values: unknown;
  created_at: Date | string;
  actor_email: string;
  owner_email: string;
};

function formatLogDate(value: Date | string) {
  const created = value instanceof Date ? value : new Date(value);
  return {
    date: created.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    createdAt: created.toISOString(),
  };
}

function toLog(row: LogRow): BudgetActionLog | null {
  const oldValues = parseSnapshot(row.old_values);
  if (!oldValues) return null;
  const { date, createdAt } = formatLogDate(row.created_at);
  return {
    id: row.log_id,
    budgetId: row.budget_id,
    budgetRef: row.budget_ref,
    budgetYear: Number(row.budget_year),
    budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
    action: row.action,
    actorEmail: row.actor_email,
    ownerEmail: row.owner_email,
    remarks: row.remarks,
    oldValues,
    newValues: parseSnapshot(row.new_values),
    date,
    createdAt,
  };
}

const logSelect = `
  SELECT
    l.log_id,
    l.budget_id,
    COALESCE(yb.budget_ref, 'Deleted') AS budget_ref,
    l.budget_year,
    l.budget_type,
    l.action,
    l.remarks,
    l.old_values,
    l.new_values,
    l.created_at,
    actor.email AS actor_email,
    owner.email AS owner_email
  FROM budget_action_logs l
  LEFT JOIN yearly_budgets yb ON yb.budget_id = l.budget_id
  INNER JOIN users actor ON actor.user_id = l.actor_user_id
  INNER JOIN users owner ON owner.user_id = l.owner_user_id
`;

export const listMyBudgetLogs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BudgetActionLog[]> => {
    const { user } = context;
    const { query } = await import("@backend/core/db");
    const rows = await query<LogRow[]>(
      `${logSelect}
       WHERE l.owner_user_id = ?
       ORDER BY l.created_at DESC, l.log_id DESC`,
      [user.userId],
    );
    return rows.map(toLog).filter((row): row is BudgetActionLog => row != null);
  });

function hodLogScope(user: AuthUser) {
  if (user.departmentId != null) {
    return {
      filter: "WHERE (l.owner_department_id = ? OR l.owner_user_id = ?)",
      params: [user.departmentId, user.userId] as unknown[],
    };
  }
  return { filter: "", params: [] as unknown[] };
}

export const listHodBudgetLogs = createServerFn({ method: "GET" })
  .middleware([roleMiddleware("HOD")])
  .handler(async ({ context }): Promise<BudgetActionLog[]> => {
    const { user } = context;
    const { query } = await import("@backend/core/db");
    const scope = hodLogScope(user);
    const rows = await query<LogRow[]>(
      `${logSelect}
       ${scope.filter}
       ORDER BY l.created_at DESC, l.log_id DESC`,
      scope.params,
    );
    return rows.map(toLog).filter((row): row is BudgetActionLog => row != null);
  });

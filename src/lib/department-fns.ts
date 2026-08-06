import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
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

export type DepartmentBudgetStatus = "Pending" | "Approved" | "Rejected";

export type DepartmentBudgetDetail = {
  id: number;
  budgetYear: number;
  budgetType: "OPEX" | "CAPEX";
  code: string;
  activity: string | null;
  itemName: string | null;
  targetMonths: string | null;
  objective: string | null;
  justification: string;
  quantity: number | null;
  costPerUnit: number | null;
  amount: number;
  effectIfNotApproved: string | null;
  alternative: string | null;
  remarks: string | null;
  rejectRemarks: string | null;
  date: string;
  status: DepartmentBudgetStatus;
  statusName: string;
  requester: string;
  department: string | null;
  designation: string | null;
};

export type DepartmentQuotationListItem = {
  id: number;
  title: string;
  requester: string;
  amount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  statusName: string;
};

type BudgetRow = {
  budget_id: number;
  budget_year: number;
  budget_type: string;
  code: string;
  activity: string | null;
  item_name: string | null;
  target_months: string | null;
  objective: string | null;
  justification: string;
  quantity: number | null;
  cost_per_unit: string | number | null;
  budget_amount: string | number;
  effect_if_not_approved: string | null;
  alternative: string | null;
  remarks: string | null;
  reject_remarks: string | null;
  status_name: string;
  created_at: Date | string;
  requester_email: string;
  department: string | null;
  designation: string | null;
};

type QuotationRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
  requester_email: string;
};

function requireUser(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("Please sign in to view your department.");
  }
  if (user.roleName !== "User") {
    throw new Error("Only staff accounts can open My Department.");
  }
  return user;
}

function mapBudgetStatus(statusName: string): DepartmentBudgetStatus {
  if (statusName.includes("rejected")) return "Rejected";
  if (statusName.includes("approved") || statusName === "completed") {
    return "Approved";
  }
  return "Pending";
}

function mapQuotationStatus(
  statusName: string,
): DepartmentQuotationListItem["status"] {
  if (statusName.includes("rejected")) return "Rejected";
  if (
    statusName === "approved_hod" ||
    statusName === "approved_ceo" ||
    statusName === "completed"
  ) {
    return "Approved";
  }
  return "Pending";
}

function formatDate(value: Date | string) {
  const created = value instanceof Date ? value : new Date(value);
  return created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTitle(firstItem: string | null, itemCount: number) {
  if (!firstItem) return "Quotation request";
  if (itemCount <= 1) return firstItem;
  return `${firstItem} + ${itemCount - 1} more`;
}

function toBudgetDetail(row: BudgetRow): DepartmentBudgetDetail {
  return {
    id: row.budget_id,
    budgetYear: Number(row.budget_year),
    budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
    code: row.code,
    activity: row.activity,
    itemName: row.item_name,
    targetMonths: row.target_months,
    objective: row.objective,
    justification: row.justification,
    quantity: row.quantity == null ? null : Number(row.quantity),
    costPerUnit: row.cost_per_unit == null ? null : Number(row.cost_per_unit),
    amount: Number(row.budget_amount),
    effectIfNotApproved: row.effect_if_not_approved,
    alternative: row.alternative,
    remarks: row.remarks,
    rejectRemarks: row.reject_remarks,
    date: formatDate(row.created_at),
    status: mapBudgetStatus(row.status_name),
    statusName: row.status_name,
    requester: row.requester_email,
    department: row.department,
    designation: row.designation,
  };
}

function departmentScope(user: AuthUser) {
  if (user.departmentId != null) {
    return {
      filter: "AND u.department_id = ?",
      params: [user.departmentId] as unknown[],
    };
  }
  return {
    filter: "AND u.user_id = ?",
    params: [user.userId] as unknown[],
  };
}

export const listDepartmentBudgetReport = createServerFn({ method: "GET" })
  .validator(
    z.object({
      budgetYear: z.number().int().min(2000).max(2100).optional(),
    }),
  )
  .handler(async ({ data }): Promise<DepartmentBudgetDetail[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireUser(session.data.user);

    const { query } = await import("@/server/db");
    const budgetYear = data.budgetYear ?? new Date().getFullYear();
    const scope = departmentScope(user);
    const params: unknown[] = [budgetYear, ...scope.params];

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         yb.item_name,
         yb.target_months,
         yb.objective,
         yb.justification,
         yb.quantity,
         yb.cost_per_unit,
         yb.budget_amount,
         yb.effect_if_not_approved,
         yb.alternative,
         yb.remarks,
         yb.reject_remarks,
         yb.created_at,
         qs.status_name,
         u.email AS requester_email,
         d.department_name AS department,
         u.designation
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_year = ?
         AND qs.status_name NOT LIKE '%rejected%'
       ${scope.filter}
       ORDER BY yb.budget_type ASC, yb.code ASC, yb.budget_id ASC`,
      params,
    );

    return rows.map(toBudgetDetail);
  });

export const listDepartmentQuotations = createServerFn({
  method: "GET",
}).handler(async (): Promise<DepartmentQuotationListItem[]> => {
  const session = await useSession<SessionUser>(sessionConfig());
  const user = requireUser(session.data.user);

  const { query } = await import("@/server/db");
  const scope = departmentScope(user);

  const rows = await query<QuotationRow[]>(
    `SELECT
       q.quotation_id,
       qs.status_name,
       q.created_at,
       COUNT(qi.quotation_item_id) AS item_count,
       COALESCE(SUM(qi.item_price * qi.item_quantity), 0) AS total_amount,
       (
         SELECT qi2.item_name
         FROM quotations_items qi2
         WHERE qi2.quotation_id = q.quotation_id
         ORDER BY qi2.quotation_item_id ASC
         LIMIT 1
       ) AS first_item,
       u.email AS requester_email
     FROM quotations q
     INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
     INNER JOIN users u ON u.user_id = q.user_id
     LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
     WHERE 1 = 1
     ${scope.filter}
     GROUP BY q.quotation_id, qs.status_name, q.created_at, u.email
     ORDER BY q.created_at DESC`,
    scope.params,
  );

  return rows.map((row) => ({
    id: row.quotation_id,
    title: formatTitle(row.first_item, Number(row.item_count)),
    requester: row.requester_email,
    amount: Number(row.total_amount),
    date: formatDate(row.created_at),
    status: mapQuotationStatus(row.status_name),
    statusName: row.status_name,
  }));
});

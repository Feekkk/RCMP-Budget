import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const APPROVED_BUDGET_STATUS_ID = 12;
const REJECTED_BUDGET_STATUS_ID = 13;

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export type HodBudgetStatus = "Pending" | "Approved" | "Rejected";

export type HodBudgetListItem = {
  id: number;
  budgetYear: number;
  budgetType: "OPEX" | "CAPEX";
  title: string;
  code: string;
  requester: string;
  amount: number;
  date: string;
  status: HodBudgetStatus;
  statusName: string;
};

export type HodBudgetDetail = {
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
  status: HodBudgetStatus;
  statusName: string;
  requester: string;
  department: string | null;
  designation: string | null;
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

function mapStatus(statusName: string): HodBudgetStatus {
  if (statusName.includes("rejected")) return "Rejected";
  if (statusName.includes("approved") || statusName === "completed") {
    return "Approved";
  }
  return "Pending";
}

function budgetTitle(row: Pick<BudgetRow, "budget_type" | "activity" | "item_name">) {
  if (row.budget_type === "CAPEX") {
    return row.item_name?.trim() || "Capital expenditure";
  }
  return row.activity?.trim() || "Operating expenditure";
}

function formatDate(value: Date | string) {
  const created = value instanceof Date ? value : new Date(value);
  return created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function requireHod(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("Please sign in to review budgets.");
  }
  if (user.roleName !== "HOD") {
    throw new Error("Only HOD accounts can review budgets.");
  }
  return user;
}

function toListItem(row: BudgetRow): HodBudgetListItem {
  return {
    id: row.budget_id,
    budgetYear: Number(row.budget_year),
    budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
    title: budgetTitle(row),
    code: row.code,
    requester: row.requester_email,
    amount: Number(row.budget_amount),
    date: formatDate(row.created_at),
    status: mapStatus(row.status_name),
    statusName: row.status_name,
  };
}

function toDetail(row: BudgetRow): HodBudgetDetail {
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
    status: mapStatus(row.status_name),
    statusName: row.status_name,
    requester: row.requester_email,
    department: row.department,
    designation: row.designation,
  };
}

export const listHodBudgets = createServerFn({ method: "GET" }).handler(
  async (): Promise<HodBudgetListItem[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         yb.item_name,
         yb.budget_amount,
         yb.created_at,
         qs.status_name,
         u.email AS requester_email,
         d.department_name AS department,
         u.designation
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE 1 = 1
       ${departmentFilter}
       ORDER BY yb.created_at DESC, yb.budget_id DESC`,
      params,
    );

    return rows.map(toListItem);
  },
);

export const getHodBudget = createServerFn({ method: "GET" })
  .validator(z.object({ budgetId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<HodBudgetDetail> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [data.budgetId];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

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
       WHERE yb.budget_id = ?
       ${departmentFilter}
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the list and try again.");
    }

    return toDetail(row);
  });

export const listHodBudgetReport = createServerFn({ method: "GET" })
  .validator(
    z.object({
      budgetYear: z.number().int().min(2000).max(2100).optional(),
    }),
  )
  .handler(async ({ data }): Promise<HodBudgetDetail[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const budgetYear = data.budgetYear ?? new Date().getFullYear();
    const params: unknown[] = [budgetYear];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

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
       ${departmentFilter}
       ORDER BY yb.budget_type ASC, yb.code ASC, yb.budget_id ASC`,
      params,
    );

    return rows.map(toDetail);
  });

export const reviewHodBudget = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        budgetId: z.number().int().positive(),
        decision: z.enum(["Approved", "Rejected"]),
        rejectRemarks: z.string().trim().max(255).optional(),
      })
      .superRefine((data, ctx) => {
        if (data.decision === "Rejected" && !data.rejectRemarks) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rejectRemarks"],
            message: "Add a short reason before rejecting this budget.",
          });
        }
      }),
  )
  .handler(async ({ data }): Promise<HodBudgetListItem> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [data.budgetId];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         yb.item_name,
         yb.budget_amount,
         yb.created_at,
         qs.status_name,
         u.email AS requester_email,
         d.department_name AS department,
         u.designation
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
       ${departmentFilter}
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the list and try again.");
    }

    if (mapStatus(row.status_name) !== "Pending") {
      throw new Error("This budget was already reviewed.");
    }

    const nextStatusId =
      data.decision === "Approved"
        ? APPROVED_BUDGET_STATUS_ID
        : REJECTED_BUDGET_STATUS_ID;

    if (data.decision === "Rejected") {
      await query(
        `UPDATE yearly_budgets
         SET status_id = ?, reject_remarks = ?
         WHERE budget_id = ?`,
        [nextStatusId, data.rejectRemarks, data.budgetId],
      );
    } else {
      await query(
        `UPDATE yearly_budgets SET status_id = ? WHERE budget_id = ?`,
        [nextStatusId, data.budgetId],
      );
    }

    return {
      ...toListItem(row),
      status: data.decision,
      statusName:
        data.decision === "Approved" ? "approved budget" : "rejected budget",
    };
  });

const CAPEX_TRANSFER_CODES = ["200-1100", "200-1000", "200-0500"] as const;
const OPEX_TRANSFER_CODES = [
  "926-0000",
  "916-0000",
  "999-1003",
  "992-0000",
  "923-0000",
] as const;

export const transferHodBudget = createServerFn({ method: "POST" })
  .validator(
    z.discriminatedUnion("targetType", [
      z.object({
        budgetId: z.number().int().positive(),
        targetType: z.literal("CAPEX"),
        code: z.enum(CAPEX_TRANSFER_CODES),
        itemName: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        targetMonths: z.string().trim().max(7).optional(),
        quantity: z.number().int().positive(),
        costPerUnit: z.number().positive(),
        budgetAmount: z.number().positive(),
        effectIfNotApproved: z.string().trim().optional(),
        alternative: z.string().trim().optional(),
        remarks: z.string().trim().optional(),
      }),
      z.object({
        budgetId: z.number().int().positive(),
        targetType: z.literal("OPEX"),
        code: z.enum(OPEX_TRANSFER_CODES),
        activity: z.string().trim().min(1),
        objective: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        targetMonths: z.string().trim().max(7).optional(),
        budgetAmount: z.number().positive(),
        remarks: z.string().trim().optional(),
      }),
    ]),
  )
  .handler(async ({ data }): Promise<HodBudgetListItem> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [data.budgetId];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         yb.item_name,
         yb.budget_amount,
         yb.created_at,
         qs.status_name,
         u.email AS requester_email,
         d.department_name AS department,
         u.designation
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
       ${departmentFilter}
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the list and try again.");
    }

    if (mapStatus(row.status_name) !== "Pending") {
      throw new Error("This budget was already reviewed.");
    }

    if (data.targetType === "CAPEX") {
      if (row.budget_type !== "OPEX") {
        throw new Error("Only OPEX budgets can be transferred to CAPEX.");
      }

      await query(
        `UPDATE yearly_budgets
         SET status_id = ?,
             budget_type = 'CAPEX',
             code = ?,
             activity = NULL,
             item_name = ?,
             target_months = ?,
             objective = NULL,
             justification = ?,
             quantity = ?,
             cost_per_unit = ?,
             budget_amount = ?,
             effect_if_not_approved = ?,
             alternative = ?,
             remarks = ?,
             reject_remarks = NULL
         WHERE budget_id = ?`,
        [
          APPROVED_BUDGET_STATUS_ID,
          data.code,
          data.itemName,
          data.targetMonths || null,
          data.justification,
          data.quantity,
          data.costPerUnit,
          data.budgetAmount,
          data.effectIfNotApproved || null,
          data.alternative || null,
          data.remarks || null,
          data.budgetId,
        ],
      );

      return {
        ...toListItem(row),
        budgetType: "CAPEX",
        title: data.itemName.trim() || "Capital expenditure",
        code: data.code,
        amount: data.budgetAmount,
        status: "Approved",
        statusName: "approved budget",
      };
    }

    if (row.budget_type !== "CAPEX") {
      throw new Error("Only CAPEX budgets can be transferred to OPEX.");
    }

    await query(
      `UPDATE yearly_budgets
       SET status_id = ?,
           budget_type = 'OPEX',
           code = ?,
           activity = ?,
           item_name = NULL,
           target_months = ?,
           objective = ?,
           justification = ?,
           quantity = NULL,
           cost_per_unit = NULL,
           budget_amount = ?,
           effect_if_not_approved = NULL,
           alternative = NULL,
           remarks = ?,
           reject_remarks = NULL
       WHERE budget_id = ?`,
      [
        APPROVED_BUDGET_STATUS_ID,
        data.code,
        data.activity,
        data.targetMonths || null,
        data.objective,
        data.justification,
        data.budgetAmount,
        data.remarks || null,
        data.budgetId,
      ],
    );

    return {
      ...toListItem(row),
      budgetType: "OPEX",
      title: data.activity.trim() || "Operating expenditure",
      code: data.code,
      amount: data.budgetAmount,
      status: "Approved",
      statusName: "approved budget",
    };
  });

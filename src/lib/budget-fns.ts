import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ResultSetHeader } from "mysql2";
import { authMiddleware } from "@/lib/middleware";

export type BudgetStatus = "Pending" | "Approved" | "Rejected";

export type BudgetListItem = {
  id: number;
  budgetYear: number;
  budgetType: "OPEX" | "CAPEX";
  title: string;
  code: string;
  amount: number;
  date: string;
  createdAt: string;
  status: BudgetStatus;
  statusName: string;
  createdByEmail: string;
  isMine: boolean;
};

export type BudgetDetail = {
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
  status: BudgetStatus;
  statusName: string;
  createdByEmail: string;
  department: string | null;
  isMine: boolean;
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
  email: string;
  department: string | null;
  created_by: number;
};

function mapBudgetStatus(statusName: string): BudgetStatus {
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

function formatBudgetDate(value: Date | string) {
  const created = value instanceof Date ? value : new Date(value);
  return {
    date: created.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    createdAt: created.toISOString(),
  };
}

const SUBMIT_STATUS_ID = 11;
const APPROVED_BUDGET_STATUS_ID = 12;

const opexLineSchema = z.object({
  code: z.string().trim().min(1),
  activity: z.string().trim().min(1),
  targetMonths: z.string().trim().max(7).optional(),
  objective: z.string().trim().min(1),
  justification: z.string().trim().min(1),
  budgetAmount: z.number().positive(),
  remarks: z.string().trim().optional(),
});

const capexLineSchema = z.object({
  code: z.string().trim().min(1),
  itemName: z.string().trim().min(1),
  justification: z.string().trim().min(1),
  targetMonths: z.string().trim().max(7).optional(),
  quantity: z.number().int().positive(),
  costPerUnit: z.number().positive(),
  budgetAmount: z.number().positive(),
  effectIfNotApproved: z.string().trim().optional(),
  alternative: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

const submitSchema = z
  .object({
    budgetYear: z.number().int().min(2000).max(2100).optional(),
    opex: z.array(opexLineSchema).default([]),
    capex: z.array(capexLineSchema).default([]),
  })
  .refine((data) => data.opex.length > 0 || data.capex.length > 0, {
    message: "Add at least one OPEX or CAPEX line, then try again.",
  });

export const submitYearlyBudget = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      throw new Error(
        message && !message.startsWith("Invalid")
          ? message
          : "Some budget details are missing. Check the form and try again.",
      );
    }
    return parsed.data;
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { user } = context;

    const { assertYearlyBudgetFormEnabled } = await import(
      "@/lib/settings.server"
    );
    await assertYearlyBudgetFormEnabled();

    const { getConnection } = await import("@/server/db");
    const conn = await getConnection();
    const budgetYear = data.budgetYear ?? new Date().getFullYear();
    const insertedIds: number[] = [];

    try {
      await conn.beginTransaction();

      for (const line of data.opex) {
        const [result] = await conn.query<ResultSetHeader>(
          `INSERT INTO yearly_budgets
            (created_by, budget_year, status_id, budget_type, code, activity,
             target_months, objective, justification, budget_amount, remarks)
           VALUES (?, ?, ?, 'OPEX', ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.userId,
            budgetYear,
            SUBMIT_STATUS_ID,
            line.code,
            line.activity,
            line.targetMonths || null,
            line.objective,
            line.justification,
            line.budgetAmount,
            line.remarks || null,
          ],
        );
        insertedIds.push(result.insertId);
      }

      for (const line of data.capex) {
        const [result] = await conn.query<ResultSetHeader>(
          `INSERT INTO yearly_budgets
            (created_by, budget_year, status_id, budget_type, code, item_name,
             target_months, justification, quantity, cost_per_unit, budget_amount,
             effect_if_not_approved, alternative, remarks)
           VALUES (?, ?, ?, 'CAPEX', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.userId,
            budgetYear,
            SUBMIT_STATUS_ID,
            line.code,
            line.itemName,
            line.targetMonths || null,
            line.justification,
            line.quantity,
            line.costPerUnit,
            line.budgetAmount,
            line.effectIfNotApproved || null,
            line.alternative || null,
            line.remarks || null,
          ],
        );
        insertedIds.push(result.insertId);
      }

      await conn.commit();
      return {
        budgetIds: insertedIds,
        count: insertedIds.length,
        budgetYear,
      };
    } catch (error) {
      await conn.rollback();
      if (error instanceof Error && error.message.startsWith("Please")) {
        throw error;
      }
      throw new Error("Could not save your budget. Try again in a moment.");
    } finally {
      conn.release();
    }
  });

export const listMyBudgets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BudgetListItem[]> => {
    const { user } = context;

    const { query } = await import("@/server/db");
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.created_by = ?
       ORDER BY yb.created_at DESC, yb.budget_id DESC`,
      [user.userId],
    );

    return rows.map((row) => {
      const { date, createdAt } = formatBudgetDate(row.created_at);
      return {
        id: row.budget_id,
        budgetYear: Number(row.budget_year),
        budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
        title: budgetTitle(row),
        code: row.code,
        amount: Number(row.budget_amount),
        date,
        createdAt,
        status: mapBudgetStatus(row.status_name),
        statusName: row.status_name,
        createdByEmail: row.email,
        isMine: true,
      };
    });
  });

export const getMyBudget = createServerFn({ method: "GET" })
  .validator(z.object({ budgetId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<BudgetDetail> => {
    const { user } = context;

    const { query } = await import("@/server/db");
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
         AND yb.created_by = ?
       LIMIT 1`,
      [data.budgetId, user.userId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the page and try again.");
    }

    const { date } = formatBudgetDate(row.created_at);
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
      costPerUnit:
        row.cost_per_unit == null ? null : Number(row.cost_per_unit),
      amount: Number(row.budget_amount),
      effectIfNotApproved: row.effect_if_not_approved,
      alternative: row.alternative,
      remarks: row.remarks,
      rejectRemarks: row.reject_remarks,
      date,
      status: mapBudgetStatus(row.status_name),
      statusName: row.status_name,
      createdByEmail: row.email,
      department: row.department,
      isMine: true,
    };
  });

export const resubmitYearlyBudget = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const schema = z.discriminatedUnion("budgetType", [
      z.object({
        budgetId: z.number().int().positive(),
        budgetType: z.literal("OPEX"),
        code: z.string().trim().min(1),
        activity: z.string().trim().min(1),
        targetMonths: z.string().trim().max(7).optional(),
        objective: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        budgetAmount: z.number().positive(),
        remarks: z.string().trim().optional(),
      }),
      z.object({
        budgetId: z.number().int().positive(),
        budgetType: z.literal("CAPEX"),
        code: z.string().trim().min(1),
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
    ]);
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      throw new Error(
        message && !message.startsWith("Invalid")
          ? message
          : "Some budget details are missing. Check the form and try again.",
      );
    }
    return parsed.data;
  })
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<BudgetDetail> => {
    const { user } = context;

    const { assertYearlyBudgetFormEnabled } = await import(
      "@/lib/settings.server"
    );
    await assertYearlyBudgetFormEnabled();

    const { query } = await import("@/server/db");
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
         AND yb.created_by = ?
       LIMIT 1`,
      [data.budgetId, user.userId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the page and try again.");
    }

    const status = mapBudgetStatus(row.status_name);
    if (status !== "Pending" && status !== "Rejected" && status !== "Approved") {
      throw new Error("This budget cannot be edited. Refresh and try again.");
    }

    const nextStatusId =
      status === "Approved" ? APPROVED_BUDGET_STATUS_ID : SUBMIT_STATUS_ID;

    if (
      (data.budgetType === "OPEX" && row.budget_type !== "OPEX") ||
      (data.budgetType === "CAPEX" && row.budget_type !== "CAPEX")
    ) {
      throw new Error("Budget type cannot be changed. Refresh and try again.");
    }

    if (data.budgetType === "OPEX") {
      await query(
        `UPDATE yearly_budgets
         SET status_id = ?,
             code = ?,
             activity = ?,
             target_months = ?,
             objective = ?,
             justification = ?,
             budget_amount = ?,
             remarks = ?,
             reject_remarks = NULL
         WHERE budget_id = ? AND created_by = ?`,
        [
          nextStatusId,
          data.code,
          data.activity,
          data.targetMonths || null,
          data.objective,
          data.justification,
          data.budgetAmount,
          data.remarks || null,
          data.budgetId,
          user.userId,
        ],
      );
    } else {
      await query(
        `UPDATE yearly_budgets
         SET status_id = ?,
             code = ?,
             item_name = ?,
             target_months = ?,
             justification = ?,
             quantity = ?,
             cost_per_unit = ?,
             budget_amount = ?,
             effect_if_not_approved = ?,
             alternative = ?,
             remarks = ?,
             reject_remarks = NULL
         WHERE budget_id = ? AND created_by = ?`,
        [
          nextStatusId,
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
          user.userId,
        ],
      );
    }

    const updatedRows = await query<BudgetRow[]>(
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
       LIMIT 1`,
      [data.budgetId],
    );

    const updated = updatedRows[0];
    if (!updated) {
      throw new Error("Budget was updated, but could not reload. Refresh the page.");
    }

    const { date } = formatBudgetDate(updated.created_at);
    return {
      id: updated.budget_id,
      budgetYear: Number(updated.budget_year),
      budgetType: updated.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
      code: updated.code,
      activity: updated.activity,
      itemName: updated.item_name,
      targetMonths: updated.target_months,
      objective: updated.objective,
      justification: updated.justification,
      quantity: updated.quantity == null ? null : Number(updated.quantity),
      costPerUnit:
        updated.cost_per_unit == null ? null : Number(updated.cost_per_unit),
      amount: Number(updated.budget_amount),
      effectIfNotApproved: updated.effect_if_not_approved,
      alternative: updated.alternative,
      remarks: updated.remarks,
      rejectRemarks: updated.reject_remarks,
      date,
      status: mapBudgetStatus(updated.status_name),
      statusName: updated.status_name,
      createdByEmail: updated.email,
      department: updated.department,
      isMine: updated.created_by === user.userId,
    };
  });

export const deleteYearlyBudget = createServerFn({ method: "POST" })
  .validator(
    z.object({
      budgetId: z.number().int().positive(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<{ budgetId: number }> => {
    const { user } = context;

    const { query } = await import("@/server/db");
    const rows = await query<
      { budget_id: number; status_name: string; created_by: number }[]
    >(
      `SELECT
         yb.budget_id,
         yb.created_by,
         qs.status_name
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       WHERE yb.budget_id = ?
         AND yb.created_by = ?
       LIMIT 1`,
      [data.budgetId, user.userId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the page and try again.");
    }

    const status = mapBudgetStatus(row.status_name);
    if (status !== "Pending" && status !== "Rejected") {
      throw new Error(
        "Only pending or rejected budgets can be removed. Refresh and try again.",
      );
    }

    await query(
      `DELETE FROM yearly_budgets WHERE budget_id = ? AND created_by = ?`,
      [data.budgetId, user.userId],
    );

    return { budgetId: data.budgetId };
  });

const CAPEX_TRANSFER_CODES = ["200-1100", "200-1000", "200-0500"] as const;
const OPEX_TRANSFER_CODES = [
  "926-0000",
  "916-0000",
  "999-1003",
  "992-0000",
  "923-0000",
] as const;

export const transferYearlyBudget = createServerFn({ method: "POST" })
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
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<BudgetDetail> => {
    const { user } = context;

    const { assertYearlyBudgetFormEnabled } = await import(
      "@/lib/settings.server"
    );
    await assertYearlyBudgetFormEnabled();

    const { query } = await import("@/server/db");
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
         AND yb.created_by = ?
       LIMIT 1`,
      [data.budgetId, user.userId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Budget not found. Refresh the page and try again.");
    }

    if (mapBudgetStatus(row.status_name) !== "Pending") {
      throw new Error(
        "Only pending budgets can be transferred. Refresh and try again.",
      );
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
         WHERE budget_id = ? AND created_by = ?`,
        [
          SUBMIT_STATUS_ID,
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
          user.userId,
        ],
      );
    } else {
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
         WHERE budget_id = ? AND created_by = ?`,
        [
          SUBMIT_STATUS_ID,
          data.code,
          data.activity,
          data.targetMonths || null,
          data.objective,
          data.justification,
          data.budgetAmount,
          data.remarks || null,
          data.budgetId,
          user.userId,
        ],
      );
    }

    const updatedRows = await query<BudgetRow[]>(
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
         yb.created_by,
         qs.status_name,
         u.email,
         d.department_name AS department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE yb.budget_id = ?
       LIMIT 1`,
      [data.budgetId],
    );

    const updated = updatedRows[0];
    if (!updated) {
      throw new Error(
        "Budget was transferred, but could not reload. Refresh the page.",
      );
    }

    const { date } = formatBudgetDate(updated.created_at);
    return {
      id: updated.budget_id,
      budgetYear: Number(updated.budget_year),
      budgetType: updated.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
      code: updated.code,
      activity: updated.activity,
      itemName: updated.item_name,
      targetMonths: updated.target_months,
      objective: updated.objective,
      justification: updated.justification,
      quantity: updated.quantity == null ? null : Number(updated.quantity),
      costPerUnit:
        updated.cost_per_unit == null ? null : Number(updated.cost_per_unit),
      amount: Number(updated.budget_amount),
      effectIfNotApproved: updated.effect_if_not_approved,
      alternative: updated.alternative,
      remarks: updated.remarks,
      rejectRemarks: updated.reject_remarks,
      date,
      status: mapBudgetStatus(updated.status_name),
      statusName: updated.status_name,
      createdByEmail: updated.email,
      department: updated.department,
      isMine: updated.created_by === user.userId,
    };
  });

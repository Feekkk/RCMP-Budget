import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ResultSetHeader } from "mysql2";
import type { AuthUser } from "@/lib/auth";

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
  date: string;
  status: BudgetStatus;
  statusName: string;
  createdByEmail: string;
  department: string | null;
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
  status_name: string;
  created_at: Date | string;
  email: string;
  department: string | null;
  created_by: number;
};

function mapBudgetStatus(statusName: string): BudgetStatus {
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

type SessionUser = {
  user: AuthUser;
};

const SUBMIT_STATUS_ID = 1;

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

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
  .handler(async ({ data }) => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to submit your budget.");
    }

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

export const listDepartmentBudgets = createServerFn({ method: "GET" }).handler(
  async (): Promise<BudgetListItem[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view budgets.");
    }

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
         u.department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       WHERE yb.created_by = ?
          OR (
            u.department IS NOT NULL
            AND u.department = (
              SELECT department FROM users WHERE user_id = ? LIMIT 1
            )
          )
       ORDER BY yb.created_at DESC, yb.budget_id DESC`,
      [user.userId, user.userId],
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
        isMine: row.created_by === user.userId,
      };
    });
  },
);

export const getDepartmentBudget = createServerFn({ method: "GET" })
  .validator(z.object({ budgetId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<BudgetDetail> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view budgets.");
    }

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
         yb.created_at,
         yb.created_by,
         qs.status_name,
         u.email,
         u.department
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       WHERE yb.budget_id = ?
         AND (
           yb.created_by = ?
           OR (
             u.department IS NOT NULL
             AND u.department = (
               SELECT department FROM users WHERE user_id = ? LIMIT 1
             )
           )
         )
       LIMIT 1`,
      [data.budgetId, user.userId, user.userId],
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
      date,
      status: mapBudgetStatus(row.status_name),
      statusName: row.status_name,
      createdByEmail: row.email,
      department: row.department,
    };
  });

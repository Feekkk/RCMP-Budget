import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { roleMiddleware } from "@backend/core/middleware";
import type { AuthUser } from "@/lib/auth";

const APPROVED_BUDGET_STATUS_ID = 12;
const REJECTED_BUDGET_STATUS_ID = 13;

const hodOnly = roleMiddleware("HOD");

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
  createdAt: string;
  status: HodBudgetStatus;
  statusName: string;
};

export type HodBudgetItem = {
  id: number;
  itemName: string | null;
  quantity: number;
  costPerUnit: number;
  amount: number;
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
  items: HodBudgetItem[];
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

type BudgetItemRow = {
  budget_item_id: number;
  budget_id: number;
  item_name: string | null;
  quantity: number;
  cost_per_unit: string | number;
  budget_amount: string | number;
};

type BudgetRow = {
  budget_id: number;
  budget_year: number;
  budget_type: string;
  code: string;
  activity: string | null;
  item_name?: string | null;
  target_months: string | null;
  objective: string | null;
  justification: string;
  quantity?: number | null;
  cost_per_unit?: string | number | null;
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

const budgetItemSelect = `
         (SELECT bi.item_name
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS item_name,
         (SELECT bi.quantity
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS quantity,
         (SELECT bi.cost_per_unit
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS cost_per_unit,`;

async function replaceBudgetItems(
  queryFn: (sql: string, params?: unknown[]) => Promise<unknown>,
  budgetId: number,
  items: Array<{
    itemName?: string | null;
    quantity: number;
    costPerUnit: number;
    budgetAmount: number;
  }>,
  fallbackItemName?: string | null,
) {
  await queryFn(`DELETE FROM budget_items WHERE budget_id = ?`, [budgetId]);
  for (const item of items) {
    await queryFn(
      `INSERT INTO budget_items
        (budget_id, item_name, quantity, cost_per_unit, budget_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [
        budgetId,
        item.itemName ?? fallbackItemName ?? null,
        item.quantity,
        item.costPerUnit,
        item.budgetAmount,
      ],
    );
  }
}

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
  return {
    date: created.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    createdAt: created.toISOString(),
  };
}

function toListItem(row: BudgetRow): HodBudgetListItem {
  const { date, createdAt } = formatDate(row.created_at);
  return {
    id: row.budget_id,
    budgetYear: Number(row.budget_year),
    budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
    title: budgetTitle(row),
    code: row.code,
    requester: row.requester_email,
    amount: Number(row.budget_amount),
    date,
    createdAt,
    status: mapStatus(row.status_name),
    statusName: row.status_name,
  };
}

function toBudgetItem(row: BudgetItemRow): HodBudgetItem {
  return {
    id: row.budget_item_id,
    itemName: row.item_name,
    quantity: Number(row.quantity),
    costPerUnit: Number(row.cost_per_unit),
    amount: Number(row.budget_amount),
  };
}

function toDetail(row: BudgetRow, items: HodBudgetItem[] = []): HodBudgetDetail {
  const first = items[0] ?? null;
  return {
    id: row.budget_id,
    budgetYear: Number(row.budget_year),
    budgetType: row.budget_type === "CAPEX" ? "CAPEX" : "OPEX",
    code: row.code,
    activity: row.activity,
    itemName: first?.itemName ?? row.item_name ?? null,
    targetMonths: row.target_months,
    objective: row.objective,
    justification: row.justification,
    quantity: first?.quantity ?? (row.quantity == null ? null : Number(row.quantity)),
    costPerUnit:
      first?.costPerUnit ?? (row.cost_per_unit == null ? null : Number(row.cost_per_unit)),
    amount: Number(row.budget_amount),
    items,
    effectIfNotApproved: row.effect_if_not_approved,
    alternative: row.alternative,
    remarks: row.remarks,
    rejectRemarks: row.reject_remarks,
    date: formatDate(row.created_at).date,
    status: mapStatus(row.status_name),
    statusName: row.status_name,
    requester: row.requester_email,
    department: row.department,
    designation: row.designation,
  };
}

async function loadBudgetItems(
  queryFn: (sql: string, params?: unknown[]) => Promise<BudgetItemRow[]>,
  budgetIds: number[],
) {
  if (budgetIds.length === 0) return new Map<number, HodBudgetItem[]>();

  const placeholders = budgetIds.map(() => "?").join(", ");
  const itemRows = await queryFn(
    `SELECT
       budget_item_id,
       budget_id,
       item_name,
       quantity,
       cost_per_unit,
       budget_amount
     FROM budget_items
     WHERE budget_id IN (${placeholders})
     ORDER BY budget_id ASC, budget_item_id ASC`,
    budgetIds,
  );

  const itemsByBudget = new Map<number, HodBudgetItem[]>();
  for (const item of itemRows) {
    const list = itemsByBudget.get(item.budget_id) ?? [];
    list.push(toBudgetItem(item));
    itemsByBudget.set(item.budget_id, list);
  }
  return itemsByBudget;
}

async function fetchBudgetDetail(
  queryFn: (sql: string, params?: unknown[]) => Promise<BudgetRow[]>,
  budgetId: number,
): Promise<HodBudgetDetail> {
  const rows = await queryFn(
    `SELECT
       yb.budget_id,
       yb.budget_year,
       yb.budget_type,
       yb.code,
       yb.activity,
       yb.target_months,
       yb.objective,
       yb.justification,
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
     LIMIT 1`,
    [budgetId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Budget was updated, but could not reload. Refresh the page.");
  }

  const itemsByBudget = await loadBudgetItems(
    async (sql, params) => {
      const rows = await queryFn(sql, params);
      return rows as unknown as BudgetItemRow[];
    },
    [budgetId],
  );

  return toDetail(row, itemsByBudget.get(budgetId) ?? []);
}

export const listHodBudgets = createServerFn({ method: "GET" })
  .middleware([hodOnly])
  .handler(async ({ context }): Promise<HodBudgetListItem[]> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
    const scope = hodDepartmentScope(user);

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         (SELECT bi.item_name
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS item_name,
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
       WHERE qs.status_name NOT LIKE '%rejected%'
       ${scope.filter}
       ORDER BY yb.created_at DESC, yb.budget_id DESC`,
      scope.params,
    );

    return rows.map(toListItem);
  });

export const getHodBudget = createServerFn({ method: "GET" })
  .validator(z.object({ budgetId: z.number().int().positive() }))
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetDetail> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
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
         ${budgetItemSelect}
         yb.target_months,
         yb.objective,
         yb.justification,
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

function hodDepartmentScope(user: AuthUser) {
  if (user.departmentId != null) {
    return {
      filter: "AND (u.department_id = ? OR yb.created_by = ?)",
      params: [user.departmentId, user.userId] as unknown[],
    };
  }
  return {
    filter: "",
    params: [] as unknown[],
  };
}

export const listHodBudgetYears = createServerFn({ method: "GET" })
  .middleware([hodOnly])
  .handler(async ({ context }): Promise<number[]> => {
    const { user } = context;
    const { query } = await import("@backend/core/db");
    const scope = hodDepartmentScope(user);
    const rows = await query<{ budget_year: number }[]>(
      `SELECT DISTINCT yb.budget_year
       FROM yearly_budgets yb
       INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
       INNER JOIN users u ON u.user_id = yb.created_by
       WHERE qs.status_name NOT LIKE '%rejected%'
       ${scope.filter}
       ORDER BY yb.budget_year DESC`,
      scope.params,
    );
    return rows.map((row) => Number(row.budget_year));
  });

export const listHodBudgetReport = createServerFn({ method: "GET" })
  .validator(
    z.object({
      budgetYear: z.number().int().min(2000).max(2100).optional(),
    }),
  )
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetDetail[]> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
    const budgetYear = data.budgetYear ?? new Date().getFullYear();
    const scope = hodDepartmentScope(user);
    const params: unknown[] = [budgetYear, ...scope.params];

    const rows = await query<BudgetRow[]>(
      `SELECT
         yb.budget_id,
         yb.budget_year,
         yb.budget_type,
         yb.code,
         yb.activity,
         yb.target_months,
         yb.objective,
         yb.justification,
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

    if (rows.length === 0) return [];

    const itemsByBudget = await loadBudgetItems(
      query,
      rows.map((row) => row.budget_id),
    );

    return rows.map((row) => toDetail(row, itemsByBudget.get(row.budget_id) ?? []));
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
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetListItem> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
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
         (SELECT bi.item_name
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS item_name,
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
      data.decision === "Approved" ? APPROVED_BUDGET_STATUS_ID : REJECTED_BUDGET_STATUS_ID;

    if (data.decision === "Rejected") {
      await query(
        `UPDATE yearly_budgets
         SET status_id = ?, reject_remarks = ?
         WHERE budget_id = ?`,
        [nextStatusId, data.rejectRemarks, data.budgetId],
      );
    } else {
      await query(`UPDATE yearly_budgets SET status_id = ? WHERE budget_id = ?`, [
        nextStatusId,
        data.budgetId,
      ]);
    }

    return {
      ...toListItem(row),
      status: data.decision,
      statusName: data.decision === "Approved" ? "approved budget" : "rejected budget",
    };
  });

const CAPEX_TRANSFER_CODES = ["200-1100", "200-1000", "200-0500"] as const;
const OPEX_TRANSFER_CODES = [
  "926-0000",
  "916-0000",
  "918-0001",
  "999-1003",
  "992-0000",
  "923-0000",
  "945-0000",
] as const;

const hodPriceItemSchema = z.object({
  quantity: z.number().int().positive(),
  costPerUnit: z.number().positive(),
  budgetAmount: z.number().positive(),
});

const hodOpexPriceItemSchema = hodPriceItemSchema.extend({
  itemName: z.string().trim().min(1),
});

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
        items: z.array(hodOpexPriceItemSchema).min(1),
        remarks: z.string().trim().optional(),
      }),
    ]),
  )
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetDetail> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
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
         (SELECT bi.item_name
          FROM budget_items bi
          WHERE bi.budget_id = yb.budget_id
          ORDER BY bi.budget_item_id ASC
          LIMIT 1) AS item_name,
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
             target_months = ?,
             objective = NULL,
             justification = ?,
             budget_amount = ?,
             effect_if_not_approved = ?,
             alternative = ?,
             remarks = ?,
             reject_remarks = NULL
         WHERE budget_id = ?`,
        [
          APPROVED_BUDGET_STATUS_ID,
          data.code,
          data.targetMonths || null,
          data.justification,
          data.budgetAmount,
          data.effectIfNotApproved || null,
          data.alternative || null,
          data.remarks || null,
          data.budgetId,
        ],
      );
      await replaceBudgetItems(query, data.budgetId, [
        {
          itemName: data.itemName,
          quantity: data.quantity,
          costPerUnit: data.costPerUnit,
          budgetAmount: data.budgetAmount,
        },
      ]);

      return fetchBudgetDetail(query, data.budgetId);
    }

    if (row.budget_type !== "CAPEX") {
      throw new Error("Only CAPEX budgets can be transferred to OPEX.");
    }

    const opexTotal = data.items.reduce((sum, item) => sum + item.budgetAmount, 0);

    await query(
      `UPDATE yearly_budgets
       SET status_id = ?,
           budget_type = 'OPEX',
           code = ?,
           activity = ?,
           target_months = ?,
           objective = ?,
           justification = ?,
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
        opexTotal,
        data.remarks || null,
        data.budgetId,
      ],
    );
    await replaceBudgetItems(
      query,
      data.budgetId,
      data.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        budgetAmount: item.budgetAmount,
      })),
    );

    return fetchBudgetDetail(query, data.budgetId);
  });

export const updateHodBudget = createServerFn({ method: "POST" })
  .validator(
    z.discriminatedUnion("budgetType", [
      z.object({
        budgetId: z.number().int().positive(),
        budgetType: z.literal("CAPEX"),
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
        budgetType: z.literal("OPEX"),
        code: z.enum(OPEX_TRANSFER_CODES),
        activity: z.string().trim().min(1),
        objective: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        targetMonths: z.string().trim().max(7).optional(),
        items: z.array(hodOpexPriceItemSchema).min(1),
        remarks: z.string().trim().optional(),
      }),
    ]),
  )
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetDetail> => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
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
         ${budgetItemSelect}
         yb.target_months,
         yb.objective,
         yb.justification,
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

    if (mapStatus(row.status_name) === "Rejected") {
      throw new Error("Rejected budgets cannot be edited.");
    }

    if (
      (data.budgetType === "OPEX" && row.budget_type !== "OPEX") ||
      (data.budgetType === "CAPEX" && row.budget_type !== "CAPEX")
    ) {
      throw new Error("Budget type cannot be changed. Refresh and try again.");
    }

    if (data.budgetType === "CAPEX") {
      await query(
        `UPDATE yearly_budgets
         SET code = ?,
             target_months = ?,
             justification = ?,
             budget_amount = ?,
             effect_if_not_approved = ?,
             alternative = ?,
             remarks = ?
         WHERE budget_id = ?`,
        [
          data.code,
          data.targetMonths || null,
          data.justification,
          data.budgetAmount,
          data.effectIfNotApproved || null,
          data.alternative || null,
          data.remarks || null,
          data.budgetId,
        ],
      );
      await replaceBudgetItems(query, data.budgetId, [
        {
          itemName: data.itemName,
          quantity: data.quantity,
          costPerUnit: data.costPerUnit,
          budgetAmount: data.budgetAmount,
        },
      ]);
    } else {
      const opexTotal = data.items.reduce((sum, item) => sum + item.budgetAmount, 0);

      await query(
        `UPDATE yearly_budgets
         SET code = ?,
             activity = ?,
             target_months = ?,
             objective = ?,
             justification = ?,
             budget_amount = ?,
             remarks = ?
         WHERE budget_id = ?`,
        [
          data.code,
          data.activity,
          data.targetMonths || null,
          data.objective,
          data.justification,
          opexTotal,
          data.remarks || null,
          data.budgetId,
        ],
      );
      await replaceBudgetItems(
        query,
        data.budgetId,
        data.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          costPerUnit: item.costPerUnit,
          budgetAmount: item.budgetAmount,
        })),
      );
    }

    return fetchBudgetDetail(query, data.budgetId);
  });

export const createHodBudget = createServerFn({ method: "POST" })
  .validator(
    z.discriminatedUnion("budgetType", [
      z.object({
        budgetYear: z.number().int().min(2000).max(2100),
        budgetType: z.literal("CAPEX"),
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
        budgetYear: z.number().int().min(2000).max(2100),
        budgetType: z.literal("OPEX"),
        code: z.enum(OPEX_TRANSFER_CODES),
        activity: z.string().trim().min(1),
        objective: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        targetMonths: z.string().trim().max(7).optional(),
        items: z.array(hodOpexPriceItemSchema).min(1),
        remarks: z.string().trim().optional(),
      }),
    ]),
  )
  .middleware([hodOnly])
  .handler(async ({ data, context }): Promise<HodBudgetDetail> => {
    const { user } = context;
    const { query } = await import("@backend/core/db");

    let insertId: number;

    if (data.budgetType === "CAPEX") {
      const result = await query<{ insertId: number }>(
        `INSERT INTO yearly_budgets
           (created_by, budget_year, status_id, budget_type, code,
            target_months, justification, budget_amount,
            effect_if_not_approved, alternative, remarks)
         VALUES (?, ?, ?, 'CAPEX', ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.userId,
          data.budgetYear,
          APPROVED_BUDGET_STATUS_ID,
          data.code,
          data.targetMonths || null,
          data.justification,
          data.budgetAmount,
          data.effectIfNotApproved || null,
          data.alternative || null,
          data.remarks || null,
        ],
      );
      insertId = result.insertId;
      await replaceBudgetItems(query, insertId, [
        {
          itemName: data.itemName,
          quantity: data.quantity,
          costPerUnit: data.costPerUnit,
          budgetAmount: data.budgetAmount,
        },
      ]);
    } else {
      const opexTotal = data.items.reduce((sum, item) => sum + item.budgetAmount, 0);
      const result = await query<{ insertId: number }>(
        `INSERT INTO yearly_budgets
           (created_by, budget_year, status_id, budget_type, code, activity,
            target_months, objective, justification, budget_amount, remarks)
         VALUES (?, ?, ?, 'OPEX', ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.userId,
          data.budgetYear,
          APPROVED_BUDGET_STATUS_ID,
          data.code,
          data.activity,
          data.targetMonths || null,
          data.objective,
          data.justification,
          opexTotal,
          data.remarks || null,
        ],
      );
      insertId = result.insertId;
      await replaceBudgetItems(
        query,
        insertId,
        data.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          costPerUnit: item.costPerUnit,
          budgetAmount: item.budgetAmount,
        })),
      );
    }

    if (!insertId) {
      throw new Error("Could not add this budget line. Try again.");
    }

    return fetchBudgetDetail(query, insertId);
  });

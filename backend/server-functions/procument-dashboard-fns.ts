import { createServerFn } from "@tanstack/react-start";
import { roleMiddleware } from "@backend/core/middleware";

const procumentOnly = roleMiddleware("Procument");

export type ProcumentBudgetTypeSummary = {
  accountType: "CAPEX" | "OPEX";
  allocation: number;
  spent: number;
  remaining: number;
};

export type ProcumentDepartmentBudget = {
  departmentId: number;
  departmentName: string;
  allocation: number;
  spent: number;
  remaining: number;
};

export type ProcumentRecentQuotation = {
  id: number;
  title: string;
  department: string;
  requester: string;
  amount: number;
  date: string;
};

export type ProcumentBudgetOverview = {
  budgetYear: number;
  departmentCount: number;
  departmentsWithBudget: number;
  totalAllocation: number;
  totalSpent: number;
  totalRemaining: number;
  submittedQuotationCount: number;
  byType: ProcumentBudgetTypeSummary[];
  departments: ProcumentDepartmentBudget[];
  recentQuotations: ProcumentRecentQuotation[];
};

type AccountAggRow = {
  department_id: number;
  department_name: string;
  account_type: string;
  credited: string | number;
  debited: string | number;
};

type ApprovedAggRow = {
  department_id: number;
  budget_type: string;
  total_amount: string | number;
};

type QuotationRecentRow = {
  quotation_id: number;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
  requester_email: string;
  department_name: string | null;
};

function formatTitle(firstItem: string | null, itemCount: number) {
  if (!firstItem) return "Quotation request";
  if (itemCount <= 1) return firstItem;
  return `${firstItem} + ${itemCount - 1} more`;
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

export const getProcumentBudgetOverview = createServerFn({ method: "GET" })
  .middleware([procumentOnly])
  .handler(async (): Promise<ProcumentBudgetOverview> => {
    const { query } = await import("@backend/core/db");
    const budgetYear = new Date().getFullYear();

    const [
      departmentCountRows,
      accountRows,
      approvedRows,
      quotationCountRows,
      recentQuotationRows,
    ] = await Promise.all([
      query<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM departments`),
      query<AccountAggRow[]>(
        `SELECT
           d.department_id,
           d.department_name,
           fa.account_type,
           COALESCE(SUM(CASE WHEN fe.entry_type = 'IN' THEN fe.amount END), 0) AS credited,
           COALESCE(SUM(CASE WHEN fe.entry_type = 'OUT' THEN fe.amount END), 0) AS debited
         FROM departments d
         INNER JOIN finance_accounts fa
           ON fa.department_id = d.department_id
          AND fa.budget_year = ?
         LEFT JOIN finance_account_entries fe ON fe.account_id = fa.account_id
         GROUP BY d.department_id, d.department_name, fa.account_type
         ORDER BY d.department_name ASC`,
        [budgetYear],
      ),
      query<ApprovedAggRow[]>(
        `SELECT
           u.department_id,
           yb.budget_type,
           COALESCE(SUM(yb.budget_amount), 0) AS total_amount
         FROM yearly_budgets yb
         INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
         INNER JOIN users u ON u.user_id = yb.created_by
         WHERE yb.budget_year = ?
           AND qs.status_name = 'approved budget'
           AND u.department_id IS NOT NULL
         GROUP BY u.department_id, yb.budget_type`,
        [budgetYear],
      ),
      query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total
         FROM quotations`,
      ),
      query<QuotationRecentRow[]>(
        `SELECT
           q.quotation_id,
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
           u.email AS requester_email,
           d.department_name
         FROM quotations q
         INNER JOIN users u ON u.user_id = q.user_id
         LEFT JOIN departments d ON d.department_id = u.department_id
         LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
         GROUP BY q.quotation_id, q.created_at, u.email, d.department_name
         ORDER BY q.created_at DESC
         LIMIT 5`,
      ),
    ]);

    const approvedByDeptType = new Map<string, number>();
    for (const row of approvedRows) {
      approvedByDeptType.set(
        `${row.department_id}:${row.budget_type}`,
        toNumber(row.total_amount),
      );
    }

    const byTypeMap = new Map<"CAPEX" | "OPEX", ProcumentBudgetTypeSummary>([
      ["CAPEX", { accountType: "CAPEX", allocation: 0, spent: 0, remaining: 0 }],
      ["OPEX", { accountType: "OPEX", allocation: 0, spent: 0, remaining: 0 }],
    ]);

    const departmentMap = new Map<number, ProcumentDepartmentBudget>();

    for (const row of accountRows) {
      const accountType = row.account_type === "CAPEX" ? "CAPEX" : "OPEX";
      const credited = toNumber(row.credited);
      const manualOut = toNumber(row.debited);
      const approvedOut =
        approvedByDeptType.get(`${row.department_id}:${accountType}`) ?? 0;
      const spent = manualOut + approvedOut;
      const remaining = credited - spent;

      const typeSummary = byTypeMap.get(accountType)!;
      typeSummary.allocation += credited;
      typeSummary.spent += spent;
      typeSummary.remaining += remaining;

      const existing = departmentMap.get(row.department_id);
      if (existing) {
        existing.allocation += credited;
        existing.spent += spent;
        existing.remaining += remaining;
      } else {
        departmentMap.set(row.department_id, {
          departmentId: row.department_id,
          departmentName: row.department_name,
          allocation: credited,
          spent,
          remaining,
        });
      }
    }

    const departments = [...departmentMap.values()].sort(
      (a, b) => b.allocation - a.allocation || a.departmentName.localeCompare(b.departmentName),
    );

    const byType = [...byTypeMap.values()];
    const totalAllocation = byType.reduce((sum, item) => sum + item.allocation, 0);
    const totalSpent = byType.reduce((sum, item) => sum + item.spent, 0);
    const totalRemaining = byType.reduce((sum, item) => sum + item.remaining, 0);

    const recentQuotations = recentQuotationRows.map((row) => {
      const created =
        row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
      return {
        id: row.quotation_id,
        title: formatTitle(row.first_item, toNumber(row.item_count)),
        department: row.department_name ?? "No department",
        requester: row.requester_email,
        amount: toNumber(row.total_amount),
        date: created.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
    });

    return {
      budgetYear,
      departmentCount: toNumber(departmentCountRows[0]?.total),
      departmentsWithBudget: departments.length,
      totalAllocation,
      totalSpent,
      totalRemaining,
      submittedQuotationCount: toNumber(quotationCountRows[0]?.total),
      byType,
      departments,
      recentQuotations,
    };
  });

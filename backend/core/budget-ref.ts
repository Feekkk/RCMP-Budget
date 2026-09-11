type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown>;

export function budgetRefPrefix(budgetType: "OPEX" | "CAPEX") {
  return budgetType === "CAPEX" ? "CPX" : "OPX";
}

export function budgetRefYearPrefix(budgetYear: number) {
  return String(budgetYear % 100).padStart(2, "0");
}

export function formatBudgetRef(
  budgetType: "OPEX" | "CAPEX",
  budgetYear: number,
  sequence: number,
) {
  const seq =
    sequence < 100 ? String(sequence).padStart(2, "0") : String(sequence);
  return `${budgetRefPrefix(budgetType)}-${budgetRefYearPrefix(budgetYear)}-${seq}`;
}

export async function nextBudgetRef(
  query: QueryFn,
  budgetYear: number,
  budgetType: "OPEX" | "CAPEX",
) {
  const prefix = budgetRefPrefix(budgetType);
  const yearPrefix = budgetRefYearPrefix(budgetYear);
  const rows = (await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(budget_ref, '-', -1) AS UNSIGNED)), 0) AS seq
     FROM yearly_budgets
     WHERE budget_year = ?
       AND budget_type = ?
       AND budget_ref LIKE ?`,
    [budgetYear, budgetType, `${prefix}-${yearPrefix}-%`],
  )) as { seq: number | string }[];
  const sequence = Number(rows[0]?.seq ?? 0) + 1;
  return formatBudgetRef(budgetType, budgetYear, sequence);
}

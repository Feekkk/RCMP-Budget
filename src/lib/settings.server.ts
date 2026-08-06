const YEARLY_BUDGET_FORM_SETTING = "Yearly Budget Form";

type SettingValueRow = {
  setting_value: number;
};

export async function readYearlyBudgetFormEnabled(): Promise<boolean> {
  const { query } = await import("@/server/db");
  const rows = await query<SettingValueRow[]>(
    `SELECT setting_value
     FROM system_settings
     WHERE setting_name = ?
     LIMIT 1`,
    [YEARLY_BUDGET_FORM_SETTING],
  );
  const row = rows[0];
  if (!row) return true;
  return Number(row.setting_value) === 1;
}

export async function assertYearlyBudgetFormEnabled() {
  const enabled = await readYearlyBudgetFormEnabled();
  if (!enabled) {
    throw new Error(
      "Yearly budget submissions are closed. Try again when your admin reopens them.",
    );
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, roleMiddleware } from "@backend/core/middleware";

export const YEARLY_BUDGET_FORM_SETTING = "Yearly Budget Form";

export type SystemSetting = {
  id: number;
  name: string;
  value: number;
  enabled: boolean;
};

type SettingRow = {
  setting_id: number;
  setting_name: string;
  setting_value: number;
};

const adminOnly = roleMiddleware("HOD", "Finance", "Procument", "CEO");
const hodOnly = roleMiddleware("HOD");

function toSetting(row: SettingRow): SystemSetting {
  return {
    id: row.setting_id,
    name: row.setting_name,
    value: Number(row.setting_value),
    enabled: Number(row.setting_value) === 1,
  };
}

export const listSystemSettings = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .handler(async (): Promise<SystemSetting[]> => {
    const { query } = await import("@backend/core/db");
    const rows = await query<SettingRow[]>(
      `SELECT setting_id, setting_name, setting_value
       FROM system_settings
       ORDER BY setting_id ASC`,
    );

    return rows.map(toSetting);
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = z
      .object({
        settingId: z.number().int().positive(),
        enabled: z.boolean(),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new Error("Could not update that setting. Refresh and try again.");
    }
    return parsed.data;
  })
  .middleware([adminOnly])
  .handler(async ({ data }): Promise<SystemSetting> => {
    const { query } = await import("@backend/core/db");
    const existing = await query<SettingRow[]>(
      `SELECT setting_id, setting_name, setting_value
       FROM system_settings
       WHERE setting_id = ?
       LIMIT 1`,
      [data.settingId],
    );

    if (!existing[0]) {
      throw new Error("That setting was not found. Refresh and try again.");
    }

    const value = data.enabled ? 1 : 0;
    await query(
      `UPDATE system_settings
       SET setting_value = ?
       WHERE setting_id = ?`,
      [value, data.settingId],
    );

    return {
      id: existing[0].setting_id,
      name: existing[0].setting_name,
      value,
      enabled: data.enabled,
    };
  });

export const isYearlyBudgetFormEnabled = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async (): Promise<boolean> => {
    const { readYearlyBudgetFormEnabled } = await import("@backend/core/settings.server");
    return readYearlyBudgetFormEnabled();
  });

export type DepartmentStaffMember = {
  userId: number;
  staffId: number | null;
  email: string;
  designation: string | null;
  roleName: string;
  lastLogin: string | null;
  lastLoginLabel: string;
};

type StaffRow = {
  user_id: number;
  staff_id: number | null;
  email: string;
  designation: string | null;
  role_name: string;
  last_login: Date | string | null;
};

function formatLastLogin(value: Date | string | null): {
  lastLogin: string | null;
  lastLoginLabel: string;
} {
  if (!value) {
    return { lastLogin: null, lastLoginLabel: "Never" };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { lastLogin: null, lastLoginLabel: "Never" };
  }
  return {
    lastLogin: date.toISOString(),
    lastLoginLabel: date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export const listHodDepartmentStaff = createServerFn({ method: "GET" })
  .middleware([hodOnly])
  .handler(async ({ context }): Promise<DepartmentStaffMember[]> => {
    const { user } = context;
    if (user.departmentId == null) {
      throw new Error("Your account has no department. Ask an admin to assign one.");
    }

    const { query } = await import("@backend/core/db");
    const rows = await query<StaffRow[]>(
      `SELECT
         u.user_id,
         u.staff_id,
         u.email,
         u.designation,
         r.role_name,
         u.last_login
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
       WHERE u.department_id = ?
       ORDER BY u.email ASC`,
      [user.departmentId],
    );

    return rows.map((row) => {
      const { lastLogin, lastLoginLabel } = formatLastLogin(row.last_login);
      return {
        userId: row.user_id,
        staffId: row.staff_id,
        email: row.email,
        designation: row.designation,
        roleName: row.role_name,
        lastLogin,
        lastLoginLabel,
      };
    });
  });

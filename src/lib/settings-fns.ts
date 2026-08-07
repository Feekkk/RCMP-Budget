import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AuthUser, RoleName } from "@/lib/auth";

export const YEARLY_BUDGET_FORM_SETTING = "Yearly Budget Form";

export type SystemSetting = {
  id: number;
  name: string;
  value: number;
  enabled: boolean;
};

type SessionUser = {
  user: AuthUser;
};

type SettingRow = {
  setting_id: number;
  setting_name: string;
  setting_value: number;
};

const sessionPassword = "budget_tracker-dev-session-secret-32";

const adminRoles = new Set<RoleName>([
  "HOD",
  "Finance",
  "Procument",
  "CEO",
]);

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function requireAdmin(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("Please sign in to view settings.");
  }
  if (!adminRoles.has(user.roleName)) {
    throw new Error("You don't have access to settings. Ask an admin for help.");
  }
  return user;
}

function toSetting(row: SettingRow): SystemSetting {
  return {
    id: row.setting_id,
    name: row.setting_name,
    value: Number(row.setting_value),
    enabled: Number(row.setting_value) === 1,
  };
}

export const listSystemSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemSetting[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    requireAdmin(session.data.user);

    const { query } = await import("@/server/db");
    const rows = await query<SettingRow[]>(
      `SELECT setting_id, setting_name, setting_value
       FROM system_settings
       ORDER BY setting_id ASC`,
    );

    return rows.map(toSetting);
  },
);

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
  .handler(async ({ data }): Promise<SystemSetting> => {
    const session = await useSession<SessionUser>(sessionConfig());
    requireAdmin(session.data.user);

    const { query } = await import("@/server/db");
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
}).handler(async (): Promise<boolean> => {
  const session = await useSession<SessionUser>(sessionConfig());
  if (!session.data.user) {
    throw new Error("Please sign in to continue.");
  }
  const { readYearlyBudgetFormEnabled } = await import(
    "@/lib/settings.server"
  );
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

export const listHodDepartmentStaff = createServerFn({ method: "GET" }).handler(
  async (): Promise<DepartmentStaffMember[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view department staff.");
    }
    if (user.roleName !== "HOD") {
      throw new Error("Only HOD accounts can view department staff.");
    }
    if (user.departmentId == null) {
      throw new Error(
        "Your account has no department. Ask an admin to assign one.",
      );
    }

    const { query } = await import("@/server/db");
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
  },
);

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

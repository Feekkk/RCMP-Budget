import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuthSession } from "@backend/core/session";
import type { AuthUser, RoleName } from "@/lib/auth";

type UserRow = {
  user_id: number;
  staff_id: number | null;
  email: string;
  password_hash: string;
  department_id: number | null;
  department: string | null;
  designation: string | null;
  role_id: number;
  role_name: string;
};

function toAuthUser(row: Omit<UserRow, "password_hash">): AuthUser {
  return {
    userId: row.user_id,
    staffId: row.staff_id,
    email: row.email,
    departmentId: row.department_id,
    department: row.department,
    designation: row.designation,
    roleId: row.role_id,
    roleName: row.role_name as RoleName,
  };
}

export const login = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = z
      .object({
        staffId: z.coerce.number().int().positive(),
        password: z.string().min(1),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new Error("Enter your staff ID and password. Please try again.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const { query } = await import("@backend/core/db");
    const bcrypt = await import("bcrypt");

    const rows = await query<UserRow[]>(
      `SELECT u.user_id, u.staff_id, u.email, u.password_hash, u.department_id,
              d.department_name AS department, u.designation, u.role_id, r.role_name
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE u.staff_id = ?
       LIMIT 1`,
      [data.staffId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Staff ID or password is wrong. Check and try again.");
    }

    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) {
      throw new Error("Staff ID or password is wrong. Check and try again.");
    }

    const user = toAuthUser(row);

    await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [user.userId]);

    const session = await getAuthSession();
    await session.update({ user });

    return user;
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const session = await getAuthSession();
    const current = session.data.user;
    if (!current) return null;

    const { query } = await import("@backend/core/db");
    const rows = await query<Omit<UserRow, "password_hash">[]>(
      `SELECT u.user_id, u.staff_id, u.email, u.department_id,
              d.department_name AS department, u.designation, u.role_id, r.role_name
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [current.userId],
    );

    const row = rows[0];
    if (!row) {
      await session.clear();
      return null;
    }

    const user = toAuthUser(row);
    await session.update({ user });
    return user;
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAuthSession();
  await session.clear();
  return { ok: true as const };
});

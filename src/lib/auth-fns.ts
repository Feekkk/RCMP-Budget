import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AuthUser, RoleName } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

type UserRow = {
  user_id: number;
  email: string;
  department: string | null;
  designation: string | null;
  role_id: number;
  role_name: string;
};

// Dev only — swap back to process.env.SESSION_SECRET in production
const sessionPassword = "budget_tracker-dev-session-secret-32";
// const sessionPassword =
//   process.env.SESSION_SECRET ?? "budget-tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

async function getAuthSession() {
  return useSession<SessionUser>(sessionConfig());
}

export const loginByEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = z
      .object({
        email: z.string().trim().email(),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new Error("Enter a valid email address. Please try again.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const { query } = await import("@/server/db");
    const email = data.email.toLowerCase();
    const rows = await query<UserRow[]>(
      `SELECT u.user_id, u.email, u.department, u.designation, u.role_id, r.role_name
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
       WHERE LOWER(u.email) = ?
       LIMIT 1`,
      [email],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("No account found for that email. Please try again.");
    }

    const user: AuthUser = {
      userId: row.user_id,
      email: row.email,
      department: row.department,
      designation: row.designation,
      roleId: row.role_id,
      roleName: row.role_name as RoleName,
    };

    await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [
      user.userId,
    ]);

    const session = await getAuthSession();
    await session.update({ user });

    return user;
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const session = await getAuthSession();
    return session.data.user ?? null;
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAuthSession();
  await session.clear();
  return { ok: true as const };
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      department: z.string().trim().max(120),
      designation: z.string().trim().max(120),
    }),
  )
  .handler(async ({ data }): Promise<AuthUser> => {
    const session = await getAuthSession();
    const current = session.data.user;
    if (!current) {
      throw new Error("Please sign in to update your profile. Please try again.");
    }

    const department = data.department || null;
    const designation = data.designation || null;
    const { query } = await import("@/server/db");

    await query(
      `UPDATE users
       SET department = ?, designation = ?
       WHERE user_id = ?`,
      [department, designation, current.userId],
    );

    const user: AuthUser = {
      ...current,
      department,
      designation,
    };
    await session.update({ user });
    return user;
  });

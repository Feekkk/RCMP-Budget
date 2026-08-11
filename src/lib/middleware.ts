import { createMiddleware } from "@tanstack/react-start";
import { getAuthSession } from "@/lib/session";
import type { AuthUser, RoleName } from "@/lib/auth";

export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await getAuthSession();
  const user = session.data.user;
  if (!user) {
    throw new Error("Please sign in to continue.");
  }
  return next({ context: { user } });
});

export function roleMiddleware(...roles: RoleName[]) {
  const allowed = new Set(roles);
  return createMiddleware({ type: "function" })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      if (!allowed.has(context.user.roleName)) {
        throw new Error("You don't have access to this. Ask an admin for help.");
      }
      return next();
    });
}

export type AuthContext = { user: AuthUser };

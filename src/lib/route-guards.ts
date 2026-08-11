import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth-fns";
import { homeForRole, type RoleName } from "@/lib/auth";

export function requireRole(role: RoleName) {
  return async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.roleName !== role) {
      throw redirect({ to: homeForRole(user) ?? "/login" });
    }
    return { user };
  };
}

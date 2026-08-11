import { useSession } from "@tanstack/react-start/server";
import type { AuthUser } from "@/lib/auth";

export type SessionUser = {
  user: AuthUser;
};

const SESSION_PASSWORD = "budget_tracker-dev-session-secret-32";

export function getAuthSession() {
  return useSession<SessionUser>({
    password: SESSION_PASSWORD,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  });
}

import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { completeMicrosoftLogin } from "@backend/server-functions/auth-fns";
import { homeForRole } from "@/lib/auth";

type CallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
};

function loginError(message: string): never {
  throw redirect({
    to: "/login",
    search: { error: message },
  });
}

export const Route = createFileRoute("/auth/microsoft/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.error === "access_denied") {
      loginError("Microsoft sign-in was cancelled. Try again.");
    }
    if (search.error) {
      loginError("Microsoft sign-in failed. Please try again.");
    }
    if (!search.code || !search.state) {
      loginError("Microsoft sign-in was incomplete. Try signing in again.");
    }

    try {
      const user = await completeMicrosoftLogin({
        data: {
          code: search.code,
          state: search.state,
        },
      });
      const to = homeForRole(user);
      if (!to) {
        loginError("Your account role has no workspace yet. Contact support for help.");
      }
      throw redirect({ to });
    } catch (error) {
      if (isRedirect(error)) throw error;
      loginError(
        error instanceof Error
          ? error.message
          : "Microsoft sign-in failed. Please try again.",
      );
    }
  },
  component: MicrosoftCallbackPage,
});

function MicrosoftCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-foreground/60">Signing you in</p>
    </div>
  );
}

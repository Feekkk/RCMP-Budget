import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/landing/Nav";
import { toast } from "sonner";
import { startMicrosoftLogin } from "@backend/server-functions/auth-fns";

type LoginSearch = {
  error?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Budget Tracker" },
      {
        name: "description",
        content:
          "Sign in to your Budget Tracker workspace with your UniKL Microsoft account.",
      },
    ],
  }),
  component: LoginPage,
});

async function redirectToMicrosoft() {
  const { url } = await startMicrosoftLogin();
  window.location.assign(url);
}

function LoginPage() {
  const { error } = Route.useSearch();
  const started = useRef(false);
  const [failed, setFailed] = useState(Boolean(error));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setFailed(true);
      return;
    }
    if (started.current) return;
    started.current = true;
    setBusy(true);
    redirectToMicrosoft().catch((err) => {
      toast.error(
        err instanceof Error ? err.message : "Microsoft sign-in failed. Please try again.",
      );
      setFailed(true);
      setBusy(false);
    });
  }, [error]);

  const retry = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await redirectToMicrosoft();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Microsoft sign-in failed. Please try again.",
      );
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <Wordmark />
      <div className="mt-10 max-w-sm text-center">
        {failed ? (
          <>
            <h1 className="font-display text-3xl">Sign in failed</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Try again with your UniKL Microsoft account, or go back home.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={retry}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-lime py-4 text-base font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Redirecting…" : "Try Microsoft sign-in again"}
            </button>
            <p className="mt-6 text-xs text-foreground/50">
              <Link to="/" className="hover:text-foreground">
                ← Back to home
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">Signing you in</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Redirecting to UniKL Microsoft sign-in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}

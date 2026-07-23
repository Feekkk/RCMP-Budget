import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { Underline } from "@/components/landing/Underline";
import { toast } from "sonner";

const roles = ["User", "HOD", "Finance", "Procument", "CEO"] as const;

type Role = (typeof roles)[number];

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Ledgerly" },
      {
        name: "description",
        content: "Sign in to your Ledgerly workspace to manage requisitions, PRFs, and approvals.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  const loginAs = (role: Role) => {
    setLoadingRole(role);
    setTimeout(() => {
      setLoadingRole(null);
      if (role === "User") {
        navigate({ to: "/user" });
        return;
      }
      if (role === "HOD") {
        navigate({ to: "/hod" });
        return;
      }
      if (role === "Finance") {
        navigate({ to: "/finance" });
        return;
      }
      if (role === "Procument") {
        navigate({ to: "/procument" });
        return;
      }
      toast("Auth isn't wired up yet", {
        description: `Signing in as ${role} will be available once authentication is connected.`,
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="flex flex-col justify-between p-8 md:p-12">
          <Wordmark />
          <div className="max-w-lg py-16">
            <h1 className="font-display text-6xl leading-[1.02] md:text-7xl">
              Welcome
              <span className="relative ml-3 inline-block">
                <span>back.</span>
                <Underline className="absolute -bottom-3 left-0 h-4 w-full" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-foreground/70">
              Sign in to review requisitions, approve PRFs, and keep an eye on
              your department's real-time budget.
            </p>
          </div>
          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} Ledgerly
          </p>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center bg-ivory p-6 md:p-12">
          <div className="w-full max-w-md rounded-[2rem] bg-background p-8 shadow-card md:p-10">
            <h2 className="font-display text-3xl">Sign in to Ledgerly</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Choose a role to continue.
            </p>

            <div className="mt-8 space-y-3">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => loginAs(role)}
                  disabled={loadingRole !== null}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-lime py-4 text-base font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-60"
                >
                  {loadingRole === role ? "Signing in…" : `Login as ${role}`}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-foreground/60">
              Don't have an account?{" "}
              <a href="#" className="text-foreground underline underline-offset-4">
                Request access
              </a>
            </p>

            <p className="mt-8 text-center text-xs text-foreground/50">
              <Link to="/" className="hover:text-foreground">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

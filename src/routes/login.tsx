import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { Underline } from "@/components/landing/Underline";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { login } from "@backend/server-functions/auth-fns";
import { homeForRole } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Budget Tracker" },
      {
        name: "description",
        content:
          "Sign in to your Budget Tracker workspace to manage requisitions, PRFs, and approvals.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedId = staffId.trim();
    if (!trimmedId || !password) {
      toast.error("Enter your staff ID and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const user = await login({
        data: { staffId: Number(trimmedId), password },
      });
      const to = homeForRole(user);
      if (!to) {
        toast.error("Your account role has no workspace yet. Contact support for help.");
        return;
      }
      await navigate({ to });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
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
              Sign in with your staff ID to review requisitions, approve PRFs,
              and keep an eye on your department's real-time budget.
            </p>
          </div>
          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} Budget Tracker
          </p>
        </div>

        <div className="flex items-center justify-center bg-ivory p-6 md:p-12">
          <div className="w-full max-w-md rounded-[2rem] bg-background p-8 shadow-card md:p-10">
            <h2 className="font-display text-3xl">Sign in to Budget Tracker</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Enter your staff ID and password to open your workspace.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <label htmlFor="staffId" className="text-sm font-medium">
                  Staff ID
                </label>
                <Input
                  id="staffId"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  autoFocus
                  placeholder="Your staff ID"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-full border-foreground/15 bg-ivory px-5 text-base shadow-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-full border-foreground/15 bg-ivory px-5 pr-12 text-base shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-foreground/50 transition hover:text-foreground disabled:opacity-60"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-lime py-4 text-base font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Continue"}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-foreground/60">
              Restricted for UNIKL RCMP staff only.
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

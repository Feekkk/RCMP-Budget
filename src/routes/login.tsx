import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { Underline } from "@/components/landing/Underline";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loginByEmail } from "@/lib/auth-fns";
import { roleHome } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Ledgerly" },
      {
        name: "description",
        content:
          "Sign in to your Ledgerly workspace to manage requisitions, PRFs, and approvals.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email to continue.");
      return;
    }

    setLoading(true);
    try {
      const user = await loginByEmail({ data: { email: trimmed } });
      const to = roleHome[user.roleName];
      if (!to) {
        toast.error(`No workspace is available for the ${user.roleName} role yet.`);
        return;
      }
      navigate({ to });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
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
              Sign in with your work email to review requisitions, approve PRFs,
              and keep an eye on your department's real-time budget.
            </p>
          </div>
          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} Ledgerly
          </p>
        </div>

        <div className="flex items-center justify-center bg-ivory p-6 md:p-12">
          <div className="w-full max-w-md rounded-[2rem] bg-background p-8 shadow-card md:p-10">
            <h2 className="font-display text-3xl">Sign in to Ledgerly</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Enter your email and we'll take you to your workspace.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@unikl.edu.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-full border-foreground/15 bg-ivory px-5 text-base shadow-none"
                />
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

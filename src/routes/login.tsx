import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { Underline } from "@/components/landing/Underline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

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
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast("Auth isn't wired up yet", {
        description: "Sign-in will be available once authentication is connected.",
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="flex flex-col justify-between p-8 md:p-12">
          <Wordmark />
          <div className="max-w-lg py-16">
            <h1 className="font-display text-6xl leading-[1.02] md:text-7xl">
              Welcome
              <span className="relative ml-3 inline-block">
                <span className="italic">back.</span>
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
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-[2rem] bg-background p-8 shadow-card md:p-10"
          >
            <h2 className="font-display text-3xl">Sign in to Ledgerly</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Use your work email to continue.
            </p>

            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-foreground/60 hover:text-foreground">
                    Forgot?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal text-foreground/70">
                  Remember me on this device
                </Label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-lime py-4 text-base font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

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
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Briefcase, Hash, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { getCurrentUser } from "@backend/server-functions/auth-fns";
import type { AuthUser } from "@/lib/auth";

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-ivory/80 px-5 py-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground/60 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-foreground/45 uppercase">
          {label}
        </p>
        <p className="mt-1 truncate text-base font-medium">{value}</p>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((row) => {
        if (active) setUser(row);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load your account. Refresh and try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const initial =
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    user?.roleName?.charAt(0) ||
    "?";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Your staff profile used across Budget Tracker.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-16 text-center shadow-card">
            <p className="text-sm text-foreground/50">Loading account…</p>
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-16 text-center shadow-card">
            <p className="text-sm text-foreground/50">
              Sign in to view your account details.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[1.5rem] bg-background shadow-card">
            <div className="relative overflow-hidden bg-lime px-6 py-10 md:px-10">
              <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-lime-foreground/10" />
              <div className="pointer-events-none absolute -bottom-20 left-24 h-40 w-40 rounded-full bg-lime-foreground/5" />
              <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-lime-foreground/10 font-display text-3xl text-lime-foreground ring-4 ring-lime-foreground/10">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-3xl text-lime-foreground md:text-4xl">
                    {user.email}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-foreground/10 px-3 py-1 text-xs font-medium text-lime-foreground">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {user.roleName}
                    </span>
                    {user.department ? (
                      <span className="inline-flex rounded-full bg-lime-foreground/10 px-3 py-1 text-xs font-medium text-lime-foreground/80">
                        {user.department}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-6 sm:grid-cols-2 md:p-8">
              <Field
                icon={Hash}
                label="Staff ID"
                value={user.staffId != null ? String(user.staffId) : "—"}
              />
              <Field icon={Mail} label="Email" value={user.email} />
              <Field icon={Shield} label="Role" value={user.roleName} />
              <Field
                icon={Building2}
                label="Department"
                value={user.department || "—"}
              />
              <Field
                icon={Briefcase}
                label="Designation"
                value={user.designation || "—"}
              />
            </div>

            <p className="border-t border-foreground/10 px-6 py-4 text-sm text-foreground/50 md:px-8">
              These details are managed by your administrator. Contact IT support
              if something looks wrong.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

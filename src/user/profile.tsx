import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Building2, Briefcase, Mail, Shield, Save } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, updateMyProfile } from "@/lib/auth-fns";
import type { AuthUser } from "@/lib/auth";

export function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((row) => {
        if (!active) return;
        setUser(row);
        setDepartment(row?.department ?? "");
        setDesignation(row?.designation ?? "");
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load profile.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    try {
      const updated = await updateMyProfile({
        data: { department, designation },
      });
      setUser(updated);
      setDepartment(updated.department ?? "");
      setDesignation(updated.designation ?? "");
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const initial =
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    user?.roleName?.charAt(0) ||
    "?";

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Manage the personal details used on your requisitions and documents.
          </p>
        </div>

        <div className="mt-6 flex gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed">
            Please always update your personal information to avoid
            misinformation in documents. Details such as department and
            designation are printed on purchase requisition forms.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-14 text-center shadow-card">
            <p className="text-sm text-foreground/50">Loading profile…</p>
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-14 text-center shadow-card">
            <p className="text-sm text-foreground/50">
              Sign in to view and update your account details.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_1fr]">
            <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-lime font-display text-3xl text-lime-foreground">
                  {initial}
                </span>
                <p className="mt-4 truncate text-sm font-medium">{user.email}</p>
                <p className="mt-1 text-xs text-foreground/50">
                  {user.roleName}
                  {user.department ? ` · ${user.department}` : ""}
                </p>
              </div>

              <ul className="mt-8 space-y-3 border-t border-foreground/10 pt-6 text-sm">
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground/50">Email</p>
                    <p className="mt-0.5 truncate font-medium">{user.email}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground/50">Role</p>
                    <p className="mt-0.5 font-medium">{user.roleName}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground/50">Department</p>
                    <p className="mt-0.5 font-medium">
                      {user.department || "Not set"}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground/50">Designation</p>
                    <p className="mt-0.5 font-medium">
                      {user.designation || "Not set"}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <form
              onSubmit={onSubmit}
              className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8"
            >
              <h2 className="font-display text-2xl">Personal details</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Keep these current so generated documents stay accurate.
              </p>

              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="h-12 rounded-xl bg-ivory"
                  />
                  <p className="text-xs text-foreground/40">
                    Email is used to sign in and cannot be changed here.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={user.roleName}
                    disabled
                    className="h-12 rounded-xl bg-ivory"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department / Programme</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Faculty of Pharmacy"
                      disabled={saving}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Lecturer"
                      disabled={saving}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-foreground/10 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

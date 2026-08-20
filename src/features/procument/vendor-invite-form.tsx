import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getVendorInviteDetails,
  submitVendorRegistration,
  type VendorInviteDetails,
} from "@backend/server-functions/vendor-fns";

type VendorInviteFormProps = {
  token: string;
};

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VendorInviteForm({ token }: VendorInviteFormProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invite, setInvite] = useState<VendorInviteDetails | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [category, setCategory] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [departmentQuery, setDepartmentQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const details = await getVendorInviteDetails({ data: { token } });
        if (!cancelled) {
          setInvite(details);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "This link is not available. Ask procurement for a new invite.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const departmentSearch = departmentQuery.trim().toLowerCase();

  const filteredDepartments = useMemo(() => {
    if (!invite || !departmentSearch) return [];
    return invite.departments.filter((department) =>
      department.name.toLowerCase().includes(departmentSearch),
    );
  }, [departmentSearch, invite]);

  const selectedDepartments = useMemo(() => {
    if (!invite) return [];
    return invite.departments.filter((department) => departmentIds.includes(department.id));
  }, [departmentIds, invite]);

  const toggleDepartment = (departmentId: number, checked: boolean) => {
    setDepartmentIds((prev) =>
      checked ? [...prev, departmentId] : prev.filter((id) => id !== departmentId),
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite) return;

    if (!vendorName.trim() || !category.trim() || !contactName.trim() || !phone.trim()) {
      toast.error("Fill in all required fields.");
      return;
    }

    if (departmentIds.length === 0) {
      toast.error("Select at least one department.");
      return;
    }

    setSubmitting(true);
    try {
      await submitVendorRegistration({
        data: {
          token,
          vendorName: vendorName.trim(),
          category: category.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          departmentIds,
        },
      });
      setSubmitted(true);
      toast.success("Your details were submitted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your details. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
        <p className="text-sm text-foreground/60">Loading registration form...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-lg rounded-[1.5rem] bg-background p-8 text-center shadow-card">
          <h1 className="font-display text-3xl">Link unavailable</h1>
          <p className="mt-3 text-sm text-foreground/60">{loadError}</p>
          <p className="mt-4 text-sm text-foreground/60">
            Contact procurement at{" "}
            <a
              href="mailto:procument.rcmp@unikl.edu.my"
              className="font-medium text-foreground underline underline-offset-2"
            >
              procument.rcmp@unikl.edu.my
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-lg rounded-[1.5rem] bg-background p-8 text-center shadow-card">
          <h1 className="font-display text-3xl">Registration complete</h1>
          <p className="mt-3 text-sm text-foreground/60">
            Thank you. Your vendor details were submitted and this link is now closed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ivory px-4 py-10 pb-12 text-foreground md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <img
            src="/unikl-official.png"
            alt="Universiti Kuala Lumpur RCMP"
            className="h-12 w-auto max-w-[240px] object-contain object-left"
          />
          <h1 className="mt-4 font-display text-4xl">Vendor registration</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Complete your company details to join our vendor list.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            This link is valid for 24 hours only and expires on{" "}
            <span className="font-medium">{formatExpiry(invite.expiresAt)}</span>. After you
            submit, the link will no longer work.
          </p>
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8"
        >
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="vendor-name">Company name</Label>
              <Input
                id="vendor-name"
                value={vendorName}
                onChange={(event) => setVendorName(event.target.value)}
                placeholder="TechSupply Sdn Bhd"
                className="h-11 rounded-full"
                required
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor-category">Category</Label>
                <Input
                  id="vendor-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="IT Equipment"
                  className="h-11 rounded-full"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vendor-contact">Contact person</Label>
                <Input
                  id="vendor-contact"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Ahmad Razak"
                  className="h-11 rounded-full"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor-email">Email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={invite.email}
                  readOnly
                  className="h-11 rounded-full bg-ivory"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+60 12-345 6789"
                  className="h-11 rounded-full"
                  required
                />
              </div>
            </div>

            <div className="grid min-w-0 gap-2">
              <Label htmlFor="department-search">Departments served</Label>
              <Input
                id="department-search"
                value={departmentQuery}
                onChange={(event) => setDepartmentQuery(event.target.value)}
                placeholder="Type to search departments"
                className="h-11 rounded-full"
              />

              {selectedDepartments.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {selectedDepartments.map((department) => (
                    <li key={department.id}>
                      <button
                        type="button"
                        onClick={() => toggleDepartment(department.id, false)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-ivory px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-background"
                      >
                        <span>{department.name}</span>
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {departmentSearch ? (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-foreground/10 p-3">
                  {filteredDepartments.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-foreground/50">No departments found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredDepartments.map((department) => {
                        const checked = departmentIds.includes(department.id);
                        return (
                          <li key={department.id}>
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-ivory">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleDepartment(department.id, value === true)
                                }
                              />
                              <span className="text-sm leading-5">{department.name}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground/50">
                  Start typing to see department suggestions.
                </p>
              )}

              <p className="text-xs text-foreground/50">
                Select the departments your company can supply.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-lime px-6 py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

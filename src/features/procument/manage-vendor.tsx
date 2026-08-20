import { useEffect, useMemo, useState } from "react";
import { Building2, Copy, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createVendorInvite,
  listVendors,
  type VendorListItem,
} from "@backend/server-functions/vendor-fns";

export function ManageVendorPage() {
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendors, setVendors] = useState<VendorListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadVendors = async () => {
      setLoadingVendors(true);
      try {
        const rows = await listVendors();
        if (!cancelled) {
          setVendors(rows);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load vendors. Refresh and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVendors(false);
        }
      }
    };

    void loadVendors();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () =>
      vendors.filter((vendor) =>
        `${vendor.id} ${vendor.name} ${vendor.category} ${vendor.contact} ${vendor.email} ${vendor.phone}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      ),
    [query, vendors],
  );

  const invitePath = inviteToken ? `/vendor-invite?token=${inviteToken}` : "";

  const inviteUrlForClipboard = useMemo(() => {
    if (!invitePath) return "";
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "";
    return `${origin}${invitePath}`;
  }, [invitePath]);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const resetInviteDialog = () => {
    setEmail("");
    setInviteToken("");
    setIsSubmitting(false);
  };

  const handleCopyInvite = async () => {
    if (!inviteUrlForClipboard) {
      toast.error("Generate the invite link first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrlForClipboard);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy the link. Please try again.");
    }
  };

  const handleSubmitAddVendor = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter an email to continue.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const invite = await createVendorInvite({
        data: {
          email: normalizedEmail,
          origin: window.location.origin,
        },
      });
      setInviteToken(invite.token);
      toast.success(`Invite email sent to ${normalizedEmail}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the invite. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseInviteDialog = () => {
    setIsAddOpen(false);
    resetInviteDialog();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Manage Vendor</h1>
            <p className="mt-2 text-sm text-foreground/60">
              {loadingVendors
                ? "Loading vendors..."
                : `${vendors.length} registered vendor${vendors.length === 1 ? "" : "s"} on your list.`}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add vendor
          </button>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Vendor list</h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendors"
                className="h-11 rounded-full pl-11"
              />
            </div>
          </div>

          {loadingVendors ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">Loading vendors...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">No vendors match your search.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map((vendor) => (
                <li
                  key={vendor.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{vendor.name}</p>
                      <p className="text-xs text-foreground/50">
                        VND-{String(vendor.id).padStart(3, "0")} · {vendor.category} ·{" "}
                        {vendor.contact}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/40">
                        {vendor.email} · {vendor.phone}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 text-xs font-medium text-foreground/70 transition hover:bg-ivory hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            resetInviteDialog();
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>
              Enter the vendor email. We will email them a registration link that expires in 24
              hours.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid min-w-0 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmitAddVendor();
            }}
          >
            <div className="grid min-w-0 gap-2">
              <label htmlFor="vendor-email" className="text-sm font-medium">
                Vendor email
              </label>
              <Input
                id="vendor-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setInviteToken("");
                }}
                placeholder="vendor@email.com"
                className="h-11 min-w-0 w-full rounded-full"
                autoFocus
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <span className="text-sm font-medium">Invite link</span>
              <button
                type="button"
                onClick={() => void handleCopyInvite()}
                disabled={!inviteUrlForClipboard}
                className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground/70 transition hover:bg-ivory disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {inviteUrlForClipboard || "The registration link appears here after you submit"}
                </span>
                <Copy className="h-4 w-4 shrink-0 text-foreground/50" />
              </button>
            </div>

            <DialogDescription className="sr-only">
              Submit generates a 24-hour invite link for the vendor to complete registration.
            </DialogDescription>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-ivory hover:text-foreground"
                onClick={handleCloseInviteDialog}
                disabled={isSubmitting}
              >
                {inviteToken ? "Done" : "Cancel"}
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-50"
                disabled={!email.trim() || isSubmitting || Boolean(inviteToken)}
              >
                {isSubmitting ? "Sending..." : inviteToken ? "Email sent" : "Submit"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

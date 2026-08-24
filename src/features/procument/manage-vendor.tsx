import { useEffect, useMemo, useState } from "react";
import { Building2, Copy, Eye, Pencil, Plus, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createVendorInvite,
  listDepartments,
  listVendors,
  updateVendor,
  type DepartmentOption,
  type VendorListItem,
} from "@backend/server-functions/vendor-fns";

type VendorEditForm = {
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  departmentIds: number[];
};

export function ManageVendorPage() {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [editForm, setEditForm] = useState<VendorEditForm>({
    name: "",
    category: "",
    contact: "",
    email: "",
    phone: "",
    departmentIds: [],
  });
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [allDepartments, setAllDepartments] = useState<DepartmentOption[]>([]);
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
        const [vendorRows, departmentRows] = await Promise.all([
          listVendors(),
          listDepartments(),
        ]);
        if (!cancelled) {
          setVendors(vendorRows);
          setAllDepartments(departmentRows);
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

  const departments = useMemo(() => {
    const byId = new Map<number, string>();
    for (const vendor of vendors) {
      for (const department of vendor.departments) {
        byId.set(department.id, department.name);
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);

  const visible = useMemo(() => {
    const search = query.toLowerCase().trim();
    const departmentId =
      departmentFilter === "all" ? null : Number(departmentFilter);

    return vendors.filter((vendor) => {
      const matchesDepartment =
        departmentId == null ||
        vendor.departments.some((department) => department.id === departmentId);

      if (!matchesDepartment) return false;

      if (!search) return true;

      return `${vendor.id} ${vendor.name} ${vendor.category} ${vendor.contact} ${vendor.email} ${vendor.phone} ${vendor.departments.map((d) => d.name).join(" ")}`
        .toLowerCase()
        .includes(search);
    });
  }, [departmentFilter, query, vendors]);

  useEffect(() => {
    if (departmentFilter === "all") return;
    const stillExists = departments.some(
      (department) => String(department.id) === departmentFilter,
    );
    if (!stillExists) {
      setDepartmentFilter("all");
    }
  }, [departmentFilter, departments]);

  const departmentSearch = departmentQuery.trim().toLowerCase();

  const filteredEditDepartments = useMemo(() => {
    if (!departmentSearch) return [];
    return allDepartments.filter((department) =>
      department.name.toLowerCase().includes(departmentSearch),
    );
  }, [allDepartments, departmentSearch]);

  const selectedEditDepartments = useMemo(
    () =>
      allDepartments.filter((department) =>
        editForm.departmentIds.includes(department.id),
      ),
    [allDepartments, editForm.departmentIds],
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

  const openVendorDetails = (vendor: VendorListItem) => {
    setSelectedVendor(vendor);
    setIsEditingVendor(false);
    setDepartmentQuery("");
    setEditForm({
      name: vendor.name,
      category: vendor.category,
      contact: vendor.contact,
      email: vendor.email,
      phone: vendor.phone,
      departmentIds: vendor.departments.map((department) => department.id),
    });
  };

  const closeVendorDetails = () => {
    setSelectedVendor(null);
    setIsEditingVendor(false);
    setIsSavingVendor(false);
    setDepartmentQuery("");
  };

  const toggleEditDepartment = (departmentId: number, checked: boolean) => {
    setEditForm((prev) => ({
      ...prev,
      departmentIds: checked
        ? [...prev.departmentIds, departmentId]
        : prev.departmentIds.filter((id) => id !== departmentId),
    }));
  };

  const handleSaveVendor = async () => {
    if (!selectedVendor) return;

    if (
      !editForm.name.trim() ||
      !editForm.category.trim() ||
      !editForm.contact.trim() ||
      !editForm.email.trim() ||
      !editForm.phone.trim()
    ) {
      toast.error("Fill in all required fields.");
      return;
    }

    if (!isValidEmail(editForm.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (editForm.departmentIds.length === 0) {
      toast.error("Select at least one department.");
      return;
    }

    setIsSavingVendor(true);
    try {
      const updated = await updateVendor({
        data: {
          vendorId: selectedVendor.id,
          vendorName: editForm.name.trim(),
          category: editForm.category.trim(),
          contactName: editForm.contact.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          departmentIds: editForm.departmentIds,
        },
      });

      setVendors((prev) => prev.map((vendor) => (vendor.id === updated.id ? updated : vendor)));
      setSelectedVendor(updated);
      setIsEditingVendor(false);
      setDepartmentQuery("");
      toast.success("Vendor details saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save vendor details. Try again.",
      );
    } finally {
      setIsSavingVendor(false);
    }
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

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-11 w-full rounded-full sm:w-64">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search vendors"
                  className="h-11 rounded-full pl-11"
                />
              </div>
            </div>
          </div>

          {loadingVendors ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">Loading vendors...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">No vendors match your filters.</p>
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
                      <p className="mt-0.5 text-xs text-foreground/40">
                        {vendor.email} · {vendor.phone}
                      </p>
                      {vendor.departments.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-foreground/40">
                          {vendor.departments.map((department) => department.name).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openVendorDetails(vendor)}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 text-xs font-medium text-foreground/70 transition hover:bg-ivory hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialog
        open={selectedVendor != null}
        onOpenChange={(open) => {
          if (!open) closeVendorDetails();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle>
              {isEditingVendor ? "Edit vendor" : (selectedVendor?.name ?? "Vendor details")}
            </DialogTitle>
            <DialogDescription>
              Vendor ID VND-{String(selectedVendor?.id ?? 0).padStart(3, "0")}
            </DialogDescription>
          </DialogHeader>

          {selectedVendor ? (
            <div className="grid gap-4 text-sm">
              {isEditingVendor ? (
                <>
                  <div className="grid gap-2">
                    <label htmlFor="edit-vendor-name" className="text-xs font-medium text-foreground/50">
                      Company name
                    </label>
                    <Input
                      id="edit-vendor-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-11 rounded-full"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        htmlFor="edit-vendor-category"
                        className="text-xs font-medium text-foreground/50"
                      >
                        Category
                      </label>
                      <Input
                        id="edit-vendor-category"
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="h-11 rounded-full"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label
                        htmlFor="edit-vendor-contact"
                        className="text-xs font-medium text-foreground/50"
                      >
                        Contact person
                      </label>
                      <Input
                        id="edit-vendor-contact"
                        value={editForm.contact}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, contact: e.target.value }))
                        }
                        className="h-11 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        htmlFor="edit-vendor-email"
                        className="text-xs font-medium text-foreground/50"
                      >
                        Email
                      </label>
                      <Input
                        id="edit-vendor-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="h-11 rounded-full"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label
                        htmlFor="edit-vendor-phone"
                        className="text-xs font-medium text-foreground/50"
                      >
                        Phone
                      </label>
                      <Input
                        id="edit-vendor-phone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="h-11 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-2">
                    <label
                      htmlFor="edit-department-search"
                      className="text-xs font-medium text-foreground/50"
                    >
                      Departments served
                    </label>
                    <Input
                      id="edit-department-search"
                      value={departmentQuery}
                      onChange={(e) => setDepartmentQuery(e.target.value)}
                      placeholder="Type to search departments"
                      className="h-11 rounded-full"
                    />

                    {selectedEditDepartments.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {selectedEditDepartments.map((department) => (
                          <li key={department.id}>
                            <button
                              type="button"
                              onClick={() => toggleEditDepartment(department.id, false)}
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
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-foreground/10 p-3">
                        {filteredEditDepartments.length === 0 ? (
                          <p className="px-1 py-2 text-sm text-foreground/50">
                            No departments found.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {filteredEditDepartments.map((department) => {
                              const checked = editForm.departmentIds.includes(department.id);
                              return (
                                <li key={department.id}>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-ivory">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) =>
                                        toggleEditDepartment(department.id, value === true)
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
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-foreground/50">Company name</p>
                    <p>{selectedVendor.name}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <p className="text-xs font-medium text-foreground/50">Category</p>
                      <p>{selectedVendor.category}</p>
                    </div>
                    <div className="grid gap-1">
                      <p className="text-xs font-medium text-foreground/50">Contact person</p>
                      <p>{selectedVendor.contact}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <p className="text-xs font-medium text-foreground/50">Email</p>
                      <p className="break-all">{selectedVendor.email}</p>
                    </div>
                    <div className="grid gap-1">
                      <p className="text-xs font-medium text-foreground/50">Phone</p>
                      <p>{selectedVendor.phone}</p>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-foreground/50">Departments served</p>
                    {selectedVendor.departments.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedVendor.departments.map((department) => (
                          <li key={department.id}>{department.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-foreground/50">No departments linked.</p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {isEditingVendor ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveVendor()}
                    disabled={isSavingVendor}
                    className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingVendor ? "Saving..." : "Save"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({
                        name: selectedVendor.name,
                        category: selectedVendor.category,
                        contact: selectedVendor.contact,
                        email: selectedVendor.email,
                        phone: selectedVendor.phone,
                        departmentIds: selectedVendor.departments.map(
                          (department) => department.id,
                        ),
                      });
                      setDepartmentQuery("");
                      setIsEditingVendor(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-5 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-ivory hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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

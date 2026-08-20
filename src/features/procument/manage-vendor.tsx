import { useState } from "react";
import { Building2, Pencil, Plus, Search } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
};

const vendors: Vendor[] = [
  {
    id: "VND-001",
    name: "TechSupply Sdn Bhd",
    category: "IT Equipment",
    contact: "Ahmad Razak",
    email: "ahmad@techsupply.my",
    phone: "+60 12-345 6789",
  },
  {
    id: "VND-002",
    name: "OfficeMart Trading",
    category: "Office Supplies",
    contact: "Siti Aminah",
    email: "sales@officemart.my",
    phone: "+60 13-876 5432",
  },
  {
    id: "VND-003",
    name: "BuildRight Hardware",
    category: "Construction",
    contact: "Lee Wei Ming",
    email: "wei@buildright.my",
    phone: "+60 16-234 5678",
  },
  {
    id: "VND-004",
    name: "FreshServe Catering",
    category: "Food & Beverage",
    contact: "Nurul Izzati",
    email: "orders@freshserve.my",
    phone: "+60 17-456 7890",
  },
  {
    id: "VND-005",
    name: "ProClean Services",
    category: "Facilities",
    contact: "Raj Kumar",
    email: "info@proclean.my",
    phone: "+60 11-987 6543",
  },
];

export function ManageVendorPage() {
  const [query, setQuery] = useState("");

  const visible = vendors.filter((vendor) =>
    `${vendor.id} ${vendor.name} ${vendor.category} ${vendor.contact} ${vendor.email} ${vendor.phone}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Manage Vendor</h1>
            <p className="mt-2 text-sm text-foreground/60">
              {vendors.length} registered vendor{vendors.length === 1 ? "" : "s"} on your list.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95"
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

          {visible.length === 0 ? (
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
                        {vendor.id} · {vendor.category} · {vendor.contact}
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
    </div>
  );
}

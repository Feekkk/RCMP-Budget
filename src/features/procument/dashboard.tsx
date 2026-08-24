import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import {
  getProcumentBudgetOverview,
  type ProcumentBudgetOverview,
} from "@backend/server-functions/procument-dashboard-fns";
import { listVendors } from "@backend/server-functions/vendor-fns";

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function spentPercent(allocation: number, spent: number) {
  if (allocation <= 0) return 0;
  return Math.min(100, Math.round((spent / allocation) * 100));
}

export function ProcumentDashboard() {
  const [overview, setOverview] = useState<ProcumentBudgetOverview | null>(null);
  const [vendorCount, setVendorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [budgetOverview, vendors] = await Promise.all([
          getProcumentBudgetOverview(),
          listVendors(),
        ]);
        if (!cancelled) {
          setOverview(budgetOverview);
          setVendorCount(vendors.length);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load the dashboard. Refresh and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const allocation = overview?.totalAllocation ?? 0;
    const spent = overview?.totalSpent ?? 0;
    const remaining = overview?.totalRemaining ?? 0;
    const departmentsWithBudget = overview?.departmentsWithBudget ?? 0;

    return [
      {
        label: "Submitted Quotation",
        value: loading ? "…" : String(overview?.submittedQuotationCount ?? 0),
        hint: "All quotations submitted",
        icon: FileSearch,
        featured: true,
      },
      {
        label: "Total Spent",
        value: loading ? "…" : formatRm(spent),
        hint: allocation > 0 ? `${spentPercent(allocation, spent)}% of allocation` : "No allocation yet",
        icon: ClipboardList,
      },
      {
        label: "Remaining",
        value: loading ? "…" : formatRm(remaining),
        hint: `${departmentsWithBudget} department${departmentsWithBudget === 1 ? "" : "s"} with budget`,
        icon: CheckCircle2,
      },
      {
        label: "Registered Vendor",
        value: loading ? "…" : String(vendorCount),
        hint: "Active on vendor list",
        icon: Building2,
      },
    ];
  }, [loading, overview, vendorCount]);

  const byType = overview?.byType ?? [];
  const departments = overview?.departments ?? [];
  const recentQuotations = overview?.recentQuotations ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Good morning</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Track department budgets and vendor coverage across the university.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, hint, icon: Icon, featured }) => (
            <div
              key={label}
              className={cn(
                "group relative overflow-hidden rounded-[1.5rem] p-6 shadow-card transition hover:-translate-y-0.5",
                featured ? "bg-lime text-lime-foreground" : "bg-background",
              )}
            >
              <Icon
                className={cn(
                  "absolute -right-4 -bottom-4 h-24 w-24 -rotate-12 transition group-hover:rotate-0",
                  featured ? "text-lime-foreground/10" : "text-foreground/5",
                )}
              />

              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    featured
                      ? "bg-lime-foreground/10"
                      : "bg-lime text-lime-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p
                  className={cn(
                    "text-sm font-medium",
                    featured ? "text-lime-foreground/70" : "text-foreground/60",
                  )}
                >
                  {label}
                </p>
              </div>

              <p className="relative mt-4 font-display text-3xl tabular-nums xl:text-4xl">
                {value}
              </p>
              <p
                className={cn(
                  "relative mt-1.5 text-xs",
                  featured ? "text-lime-foreground/60" : "text-foreground/50",
                )}
              >
                {hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Department budgets</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  {loading
                    ? "Loading budget overview…"
                    : `FY ${overview?.budgetYear ?? new Date().getFullYear()} · ${overview?.departmentsWithBudget ?? 0} of ${overview?.departmentCount ?? 0} departments funded`}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(["CAPEX", "OPEX"] as const).map((type) => {
                const item = byType.find((row) => row.accountType === type);
                const allocation = item?.allocation ?? 0;
                const spent = item?.spent ?? 0;
                const remaining = item?.remaining ?? 0;
                const percent = spentPercent(allocation, spent);

                return (
                  <div
                    key={type}
                    className="rounded-2xl border border-foreground/8 bg-ivory/60 p-4 md:p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{type}</p>
                      <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/55">
                        {percent}% used
                      </span>
                    </div>
                    <p className="mt-3 font-display text-2xl tabular-nums">
                      {loading ? "…" : formatRm(allocation)}
                    </p>
                    <p className="mt-1 text-xs text-foreground/50">Total allocation</p>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-lime"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-foreground/55">
                      <span>Spent {loading ? "…" : formatRm(spent)}</span>
                      <span>Left {loading ? "…" : formatRm(remaining)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">By department</h3>
                <span className="text-xs text-foreground/45">
                  Sorted by allocation
                </span>
              </div>

              {loading ? (
                <div className="mt-4 rounded-xl border border-dashed border-foreground/15 py-10 text-center">
                  <p className="text-sm text-foreground/50">Loading departments…</p>
                </div>
              ) : departments.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-foreground/15 py-10 text-center">
                  <p className="text-sm text-foreground/50">
                    No department budgets found for this year.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-foreground/10">
                  {departments.map((department) => {
                    const percent = spentPercent(
                      department.allocation,
                      department.spent,
                    );
                    return (
                      <li
                        key={department.departmentId}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {department.departmentName}
                          </p>
                          <div className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full bg-lime"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-foreground/45">
                            Spent {formatRm(department.spent)} · {percent}% used
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {formatRm(department.allocation)}
                          </p>
                          <p className="mt-0.5 text-xs text-foreground/45 tabular-nums">
                            Left {formatRm(department.remaining)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[1.5rem] bg-foreground/10 p-5 text-foreground shadow-card">
              <p className="text-xs tracking-[0.16em] text-foreground/50 uppercase">
                FY {overview?.budgetYear ?? new Date().getFullYear()}
              </p>
              <p className="mt-3 font-display text-3xl tabular-nums">
                {loading ? "…" : formatRm(overview?.totalRemaining ?? 0)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                remaining across all departments
              </p>
              <p className="mt-5 text-xs text-foreground/45">
                Allocation {loading ? "…" : formatRm(overview?.totalAllocation ?? 0)} · Spent{" "}
                {loading ? "…" : formatRm(overview?.totalSpent ?? 0)}
              </p>
            </div>

            <div className="flex-1 rounded-[1.5rem] bg-background p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Recent quotations</h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    Latest submitted quotation requests
                  </p>
                </div>
                <Link
                  to="/procument/quotations"
                  className="rounded-full bg-ivory px-3 py-1.5 text-[11px] font-medium text-foreground/60 transition hover:text-foreground"
                >
                  View all
                </Link>
              </div>

              {loading ? (
                <p className="mt-4 text-sm text-foreground/50">Loading…</p>
              ) : recentQuotations.length === 0 ? (
                <p className="mt-4 text-sm text-foreground/50">
                  No quotations submitted yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recentQuotations.map((quotation) => (
                    <li key={quotation.id} className="rounded-xl bg-ivory px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{quotation.title}</p>
                        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/55">
                          QT-{quotation.id}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-foreground/50">
                        {quotation.department} · {quotation.requester}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-foreground/40">
                        <span>{quotation.date}</span>
                        <span className="tabular-nums">{formatRm(quotation.amount)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

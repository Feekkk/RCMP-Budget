import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Wallet,
  Receipt,
  Hourglass,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { useAutoHideReveal } from "@/lib/use-auto-hide";
import {
  listHodQuotations,
  type HodQuotationListItem,
} from "@/lib/hod-quotation-fns";

const flows = [
  {
    label: "CAPEX",
    hint: "Capital expenditure",
    incoming: "RM 2,000.00",
    outgoing: "RM 28,350.00",
  },
  {
    label: "OPEX",
    hint: "Operating expenditure",
    incoming: "RM 3,500.00",
    outgoing: "RM 20,000.00",
  },
];

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function HodDashboard() {
  const { revealed, toggle } = useAutoHideReveal();
  const [pending, setPending] = useState<HodQuotationListItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listHodQuotations()
      .then((rows) => {
        if (!active) return;
        const waiting = rows.filter((row) => row.status === "Pending");
        setPendingCount(waiting.length);
        setPending(waiting.slice(0, 3));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load pending approvals.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Department budget",
        value: "RM 120,000",
        hint: "FY 2026 allocation",
        icon: Wallet,
        masked: true,
        featured: true,
      },
      {
        label: "Spent to date",
        value: "RM 48,350",
        hint: "40% of allocation",
        icon: Receipt,
        masked: true,
        progress: 40,
      },
      {
        label: "Awaiting your review",
        value: loading ? "…" : String(pendingCount),
        hint: "Requisitions pending approval",
        icon: Hourglass,
      },
    ],
    [loading, pendingCount],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Good morning, Tun Hazman</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Here's an overview of your department's spending and pending approvals.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map(
            ({ label, value, hint, icon: Icon, masked, featured, progress }) => {
              const isRevealed = !masked || revealed[label];
              return (
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

                  <div className="flex items-center justify-between">
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
                    {masked && (
                      <button
                        type="button"
                        onClick={() => toggle(label)}
                        aria-label={isRevealed ? `Hide ${label}` : `Show ${label}`}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full transition",
                          featured
                            ? "hover:bg-lime-foreground/10"
                            : "text-foreground/50 hover:bg-ivory hover:text-foreground",
                        )}
                      >
                        {isRevealed ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <p className="relative mt-4 font-display text-4xl tabular-nums">
                    {isRevealed ? value : "RM ••••••"}
                  </p>
                  <p
                    className={cn(
                      "relative mt-1.5 text-xs",
                      featured ? "text-lime-foreground/60" : "text-foreground/50",
                    )}
                  >
                    {hint}
                  </p>

                  {progress !== undefined && (
                    <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-ivory">
                      <div
                        className="h-full rounded-full bg-lime transition-all duration-500"
                        style={{ width: isRevealed ? `${progress}%` : "100%" }}
                      />
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {flows.map(({ label, hint, incoming, outgoing }) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-[1.5rem] bg-background p-5 shadow-card transition hover:-translate-y-0.5"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-foreground/50">{hint}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs text-foreground/50">In</p>
                  </div>
                  <p className="mt-2 font-display text-2xl tabular-nums text-emerald-600">
                    {incoming}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs text-foreground/50">Out</p>
                  </div>
                  <p className="mt-2 font-display text-2xl tabular-nums text-red-600">
                    {outgoing}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Pending approvals</h2>
            <Link
              to="/hod/approval"
              className="inline-flex items-center gap-1 text-sm text-foreground/60 transition hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-foreground/50">
              Loading pending approvals…
            </p>
          ) : pending.length === 0 ? (
            <p className="mt-6 text-sm text-foreground/50">
              No requisitions waiting for your review.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-foreground/10">
              {pending.map((req) => (
                <li key={req.id}>
                  <Link
                    to="/hod/approval"
                    className="flex items-center justify-between gap-4 py-4 transition hover:bg-ivory/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-foreground/50">
                        QT-{req.id} · {req.requester} · {req.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium tabular-nums">
                        {formatRm(req.amount)}
                      </span>
                      <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-full bg-ivory px-3 py-1 text-xs font-medium text-foreground/60">
                        View
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

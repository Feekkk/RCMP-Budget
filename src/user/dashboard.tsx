import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Receipt,
  Hourglass,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { useAutoHideReveal } from "@/lib/use-auto-hide";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listMyQuotations,
  type QuotationListItem,
} from "@/lib/quotation-fns";
import { listMyBudgets, type BudgetListItem } from "@/lib/budget-fns";
import { isYearlyBudgetFormEnabled } from "@/lib/settings-fns";
import {
  getUserDashboardStats,
  type UserDashboardStats,
} from "@/lib/user-dashboard-fns";

type ActivityStatus = "Pending" | "Approved" | "Rejected";

type RecentActivity = {
  key: string;
  title: string;
  ref: string;
  amount: number;
  status: ActivityStatus;
  createdAt: string;
};

const statusConfig: Record<ActivityStatus, { icon: LucideIcon; tone: string }> = {
  Pending: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Approved: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Rejected: { icon: XCircle, tone: "text-red-600 bg-red-100" },
};

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(date = new Date()) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function UserDashboard() {
  const navigate = useNavigate();
  const { revealed, toggle } = useAutoHideReveal();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(
    null,
  );
  const [budgetFormEnabled, setBudgetFormEnabled] = useState(true);
  const greetingLabel = timeGreeting();
  const todayLabel = formatToday();

  useEffect(() => {
    let active = true;
    Promise.all([listMyQuotations(), listMyBudgets()])
      .then(([quotations, budgets]: [QuotationListItem[], BudgetListItem[]]) => {
        if (!active) return;
        const merged: RecentActivity[] = [
          ...quotations.map((row) => ({
            key: `qt-${row.id}`,
            title: row.title,
            ref: `QT-${row.id}`,
            amount: row.amount,
            status: row.status,
            createdAt: row.createdAt,
          })),
          ...budgets.map((row) => ({
            key: `yb-${row.id}`,
            title: row.title,
            ref: `YB-${row.id} · ${row.budgetType}`,
            amount: row.amount,
            status: row.status,
            createdAt: row.createdAt,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 3);
        setActivities(merged);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load recent activities. Refresh the page to try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getUserDashboardStats()
      .then((data) => {
        if (active) setDashboardStats(data);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard figures. Refresh the page to try again.",
        );
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    isYearlyBudgetFormEnabled()
      .then((enabled) => {
        if (active) setBudgetFormEnabled(enabled);
      })
      .catch(() => {
        if (active) setBudgetFormEnabled(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const spentPercent =
    dashboardStats && dashboardStats.allocation > 0
      ? Math.min(
          100,
          Math.round(
            (dashboardStats.approvedSpent / dashboardStats.allocation) * 100,
          ),
        )
      : 0;

  const stats = useMemo(
    () => [
      {
        label: "Department budget",
        value: statsLoading
          ? "…"
          : formatRm(dashboardStats?.allocation ?? 0),
        hint: statsLoading
          ? "Loading…"
          : `FY ${dashboardStats?.budgetYear ?? new Date().getFullYear()} Allocation`,
        icon: Wallet,
        masked: true,
        featured: true,
      },
      {
        label: "Spent to date",
        value: statsLoading
          ? "…"
          : formatRm(dashboardStats?.approvedSpent ?? 0),
        hint: statsLoading
          ? "Loading…"
          : dashboardStats && dashboardStats.allocation > 0
            ? `${spentPercent}% of allocation`
            : "Approved OPEX + CAPEX",
        icon: Receipt,
        masked: true,
        progress: spentPercent,
      },
      {
        label: "Pending approvals",
        value: statsLoading
          ? "…"
          : String(dashboardStats?.pendingCount ?? 0),
        hint: "Awaiting HOD review",
        icon: Hourglass,
      },
    ],
    [dashboardStats, spentPercent, statsLoading],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">{greetingLabel}</h1>
            <p className="mt-2 text-sm text-foreground/60">{todayLabel}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
              >
                <Plus className="h-4 w-4" />
                Make Request
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void navigate({ to: "/user/quotation" })}>
                Request Quotation
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!budgetFormEnabled}
                onSelect={() => {
                  if (!budgetFormEnabled) {
                    toast.error(
                      "Yearly budget submissions are closed. Try again later.",
                    );
                    return;
                  }
                  void navigate({ to: "/user/budget" });
                }}
              >
                Yearly Budget
                {!budgetFormEnabled ? " (Closed)" : ""}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent Activities</h2>
            <Link
              to="/user/history"
              className="inline-flex items-center gap-1 text-sm text-foreground/60 transition hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-foreground/50">
              Loading recent activities…
            </p>
          ) : activities.length === 0 ? (
            <p className="mt-6 text-sm text-foreground/50">
              No activities yet.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-foreground/10">
              {activities.map((item) => {
                const { icon: Icon, tone } = statusConfig[item.status];
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-foreground/50">{item.ref}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {formatRm(item.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

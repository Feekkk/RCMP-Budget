import { useEffect, useState } from "react";
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
import { isYearlyBudgetFormEnabled } from "@/lib/settings-fns";

const stats = [
  {
    label: "Department budget",
    value: "RM 120,000",
    hint: "FY 2026 Allocation",
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
    label: "Pending approvals",
    value: "3",
    hint: "Awaiting HOD review",
    icon: Hourglass,
  },
];

type Status = QuotationListItem["status"];

const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
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
  const [requisitions, setRequisitions] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetFormEnabled, setBudgetFormEnabled] = useState(true);
  const greetingLabel = timeGreeting();
  const todayLabel = formatToday();

  useEffect(() => {
    let active = true;
    listMyQuotations()
      .then((rows) => {
        if (active) setRequisitions(rows.slice(0, 3));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load recent requisitions. Refresh the page to try again.",
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
            <h2 className="font-display text-2xl">Recent requisitions</h2>
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
              Loading recent requisitions…
            </p>
          ) : requisitions.length === 0 ? (
            <p className="mt-6 text-sm text-foreground/50">
              No requisitions yet.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-foreground/10">
              {requisitions.map((req) => {
                const { icon: Icon, tone } = statusConfig[req.status];
                return (
                  <li
                    key={req.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-foreground/50">QT-{req.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {formatRm(req.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {req.status}
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

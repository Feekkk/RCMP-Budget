import {
  Wallet,
  Receipt,
  Hourglass,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { useAutoHideReveal } from "@/lib/use-auto-hide";

const stats = [
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
    value: "3",
    hint: "Requisitions pending approval",
    icon: Hourglass,
  },
];

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

const pendingApprovals = [
  {
    id: "REQ-1042",
    title: "Office chairs (x6)",
    requester: "Afiq Danial",
    amount: "RM 4,200",
    submitted: "Jul 14, 2026",
  },
  {
    id: "REQ-1041",
    title: "Projector for meeting room",
    requester: "Mei Ling Tan",
    amount: "RM 3,100",
    submitted: "Jul 13, 2026",
  },
  {
    id: "REQ-1040",
    title: "Quarterly stationery restock",
    requester: "Hafiz Rahman",
    amount: "RM 860",
    submitted: "Jul 12, 2026",
  },
];

export function HodDashboard() {
  const { revealed, toggle } = useAutoHideReveal();

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
          <h2 className="font-display text-2xl">Pending approvals</h2>

          <ul className="mt-6 divide-y divide-foreground/10">
            {pendingApprovals.map(({ id, title, requester, amount, submitted }) => (
              <li key={id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs text-foreground/50">
                    {id} · {requester} · {submitted}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium tabular-nums">{amount}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Approve ${id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:brightness-95"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Reject ${id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:brightness-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

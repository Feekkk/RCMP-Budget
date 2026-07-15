import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

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
    label: "Pending approvals",
    value: "3",
    hint: "Awaiting HOD review",
    icon: Hourglass,
  },
];

const requisitions = [
  {
    id: "REQ-1042",
    title: "Office chairs (x6)",
    amount: "RM 4,200",
    status: "Pending",
    icon: Clock,
    tone: "text-amber-600 bg-amber-100",
  },
  {
    id: "REQ-1039",
    title: "Team laptop refresh",
    amount: "RM 18,500",
    status: "Approved",
    icon: CheckCircle2,
    tone: "text-emerald-700 bg-emerald-100",
  },
  {
    id: "REQ-1035",
    title: "Marketing print run",
    amount: "RM 2,750",
    status: "Rejected",
    icon: XCircle,
    tone: "text-red-600 bg-red-100",
  },
];

export function UserDashboard() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Good morning, Afiq</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Here's what's happening with your requisitions today.
            </p>
          </div>
          <Link
            to="/user/quotation"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            Request Quotation
          </Link>
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
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [label]: !prev[label] }))
                        }
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

          <ul className="mt-6 divide-y divide-foreground/10">
            {requisitions.map(({ id, title, amount, status, icon: Icon, tone }) => (
              <li key={id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs text-foreground/50">{id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{amount}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

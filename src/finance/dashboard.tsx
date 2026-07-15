import { useState } from "react";
import {
  Wallet,
  Receipt,
  Hourglass,
  Eye,
  EyeOff,
  Banknote,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Company budget",
    value: "RM 1,250,000",
    hint: "FY 2026 allocation",
    icon: Wallet,
    masked: true,
    featured: true,
  },
  {
    label: "Disbursed to date",
    value: "RM 512,400",
    hint: "41% of allocation",
    icon: Receipt,
    masked: true,
    progress: 41,
  },
  {
    label: "Awaiting payment",
    value: "4",
    hint: "Approved PRFs to process",
    icon: Hourglass,
  },
];

const pendingPayments = [
  {
    id: "PRF-2087",
    title: "Office chairs (x6)",
    department: "IT Department",
    amount: "RM 4,200",
    approved: "Jul 14, 2026",
  },
  {
    id: "PRF-2086",
    title: "Projector for meeting room",
    department: "IT Department",
    amount: "RM 3,100",
    approved: "Jul 13, 2026",
  },
  {
    id: "PRF-2085",
    title: "Annual software licenses",
    department: "Operations",
    amount: "RM 18,750",
    approved: "Jul 12, 2026",
  },
  {
    id: "PRF-2084",
    title: "Quarterly stationery restock",
    department: "Human Resources",
    amount: "RM 860",
    approved: "Jul 11, 2026",
  },
];

export function FinanceDashboard() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Good morning, Finance</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Here's an overview of company-wide spending and payments awaiting processing.
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
          <h2 className="font-display text-2xl">Payments to process</h2>

          <ul className="mt-6 divide-y divide-foreground/10">
            {pendingPayments.map(({ id, title, department, amount, approved }) => (
              <li key={id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs text-foreground/50">
                    {id} · {department} · Approved {approved}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium tabular-nums">{amount}</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-medium text-lime-foreground transition hover:brightness-95"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Process payment
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

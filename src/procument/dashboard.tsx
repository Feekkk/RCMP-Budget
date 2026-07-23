import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Truck,
  Hourglass,
  FileSearch,
  ArrowUpRight,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Open requests",
    value: "5",
    hint: "Awaiting vendor quotes",
    icon: ClipboardList,
    featured: true,
  },
  {
    label: "Quotes gathered",
    value: "12",
    hint: "This month",
    icon: FileSearch,
  },
  {
    label: "Ready to purchase",
    value: "3",
    hint: "Quotes sent for HOD sign-off",
    icon: Truck,
  },
];

const pendingQuotes = [
  {
    id: "QT-312",
    title: "Office chairs (x6)",
    department: "IT Department",
    requester: "Afiq Danial",
    items: 1,
    submitted: "Jul 14, 2026",
  },
  {
    id: "QT-311",
    title: "Projector for meeting room",
    department: "IT Department",
    requester: "Mei Ling Tan",
    items: 1,
    submitted: "Jul 13, 2026",
  },
  {
    id: "QT-310",
    title: "Quarterly stationery restock",
    department: "Human Resources",
    requester: "Hafiz Rahman",
    items: 8,
    submitted: "Jul 12, 2026",
  },
  {
    id: "QT-309",
    title: "Team laptop refresh",
    department: "Operations",
    requester: "Afiq Danial",
    items: 4,
    submitted: "Jul 10, 2026",
  },
];

export function ProcumentDashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Good morning, Rina</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Source vendor quotes for open requests and keep purchases moving.
            </p>
          </div>
          <Link
            to="/procument/quotations"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
          >
            View all quotations
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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

              <p className="relative mt-4 font-display text-4xl tabular-nums">{value}</p>
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

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Needs sourcing</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
              <Hourglass className="h-3.5 w-3.5" />
              {pendingQuotes.length} open
            </span>
          </div>

          <ul className="mt-6 divide-y divide-foreground/10">
            {pendingQuotes.map(({ id, title, department, requester, items, submitted }) => (
              <li key={id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs text-foreground/50">
                    {id} · {department} · {requester} · {items} item
                    {items === 1 ? "" : "s"} · {submitted}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-medium text-lime-foreground transition hover:brightness-95"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  Source quotes
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

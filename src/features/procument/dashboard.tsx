import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSearch,
  Package,
  UserRound,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Total Quotation (This Month)",
    value: "12",
    hint: "All quotations submitted",
    icon: FileSearch,
    featured: true,
  },
  {
    label: "Pending RFQ",
    value: "5",
    hint: "Awaiting vendor quotes",
    icon: ClipboardList,
  },
  {
    label: "Completed RFQ",
    value: "7",
    hint: "Fully sourced this month",
    icon: CheckCircle2,
  },
  {
    label: "Registered Vendor",
    value: "24",
    hint: "Active on vendor list",
    icon: Building2,
  },
];

type QueueItem = {
  id: string;
  title: string;
  department: string;
  requester: string;
  items: number;
  submitted: string;
  daysOpen: number;
  quotes: number;
  quotesNeeded: number;
  category: string;
};

const sourcingQueue: QueueItem[] = [
  {
    id: "QT-312",
    title: "Office chairs (x6)",
    department: "IT Department",
    requester: "Afiq Danial",
    items: 1,
    submitted: "Jul 14, 2026",
    daysOpen: 37,
    quotes: 0,
    quotesNeeded: 3,
    category: "Furniture",
  },
  {
    id: "QT-311",
    title: "Projector for meeting room",
    department: "IT Department",
    requester: "Mei Ling Tan",
    items: 1,
    submitted: "Jul 13, 2026",
    daysOpen: 38,
    quotes: 1,
    quotesNeeded: 3,
    category: "IT equipment",
  },
  {
    id: "QT-310",
    title: "Quarterly stationery restock",
    department: "Human Resources",
    requester: "Hafiz Rahman",
    items: 8,
    submitted: "Jul 12, 2026",
    daysOpen: 39,
    quotes: 2,
    quotesNeeded: 3,
    category: "Stationery",
  },
  {
    id: "QT-309",
    title: "Team laptop refresh",
    department: "Operations",
    requester: "Afiq Danial",
    items: 4,
    submitted: "Jul 10, 2026",
    daysOpen: 41,
    quotes: 0,
    quotesNeeded: 3,
    category: "IT equipment",
  },
];

const awaitingVendors = [
  {
    id: "QT-308",
    vendor: "TechMart Sdn Bhd",
    item: "Annual software licenses",
    sent: "2 days ago",
  },
  {
    id: "QT-307",
    vendor: "OfficePlus",
    item: "Ergonomic desks (x4)",
    sent: "Yesterday",
  },
  {
    id: "QT-306",
    vendor: "PrintHub",
    item: "Colour printer toner",
    sent: "Today",
  },
];

function agingTone(days: number) {
  if (days >= 14) return "bg-rose-100 text-rose-800";
  if (days >= 7) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function agingLabel(days: number) {
  if (days >= 14) return "Overdue";
  if (days >= 7) return "Due soon";
  return "On track";
}

export function ProcumentDashboard() {
  const overdueCount = sourcingQueue.filter((q) => q.daysOpen >= 14).length;

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Good morning, Rina</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Source vendor quotes for open requests and keep purchases moving.
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

        <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Sourcing queue</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  {overdueCount} overdue · pick the oldest first
                </p>
              </div>
              <Link
                to="/procument/quotations"
                className="rounded-full bg-ivory px-3 py-1.5 text-xs font-medium text-foreground/60 transition hover:text-foreground"
              >
                View all
              </Link>
            </div>

            <ul className="mt-6 space-y-3">
              {sourcingQueue.map((item) => {
                const progress = Math.round((item.quotes / item.quotesNeeded) * 100);
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-foreground/8 bg-ivory/60 p-4 md:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/55">
                            {item.id}
                          </span>
                          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-foreground/50">
                            {item.category}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/50">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {item.department}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {item.requester}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {item.items} item{item.items === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                          agingTone(item.daysOpen),
                        )}
                      >
                        <Clock3 className="h-3 w-3" />
                        {agingLabel(item.daysOpen)} · {item.daysOpen}d
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div className="min-w-[10rem] flex-1">
                        <div className="flex items-center justify-between text-[11px] text-foreground/50">
                          <span>
                            Quotes {item.quotes}/{item.quotesNeeded}
                          </span>
                          <span>{item.submitted}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className="h-full rounded-full bg-lime"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        to="/procument/quotations"
                        className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-medium text-lime-foreground transition hover:brightness-95"
                      >
                        <FileSearch className="h-3.5 w-3.5" />
                        Source quotes
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[1.5rem] bg-foreground p-5 text-background shadow-card">
              <p className="text-xs tracking-[0.16em] text-background/55 uppercase">
                Today
              </p>
              <p className="mt-3 font-display text-4xl tabular-nums">
                {sourcingQueue.length}
              </p>
              <p className="mt-1 text-sm text-background/65">
                requests still need quotes
              </p>
              <p className="mt-5 text-xs text-background/50">
                Policy: attach 3 vendor quotes before sending to HOD.
              </p>
            </div>

            <div className="flex-1 rounded-[1.5rem] bg-background p-5 shadow-card">
              <h3 className="text-sm font-medium">Waiting on vendors</h3>
              <p className="mt-1 text-xs text-foreground/50">
                Follow up if no reply in 2 days
              </p>
              <ul className="mt-4 space-y-3">
                {awaitingVendors.map((row) => (
                  <li key={row.id} className="rounded-xl bg-ivory px-3 py-3">
                    <p className="text-sm font-medium">{row.vendor}</p>
                    <p className="mt-0.5 truncate text-xs text-foreground/50">
                      {row.id} · {row.item}
                    </p>
                    <p className="mt-1 text-[11px] text-foreground/40">Sent {row.sent}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

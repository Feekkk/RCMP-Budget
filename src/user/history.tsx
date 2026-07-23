import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { RequestMenu } from "./request-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "Pending" | "Approved" | "Rejected";

const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
  Pending: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Approved: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Rejected: { icon: XCircle, tone: "text-red-600 bg-red-100" },
};

const requisitions: {
  id: string;
  title: string;
  amount: string;
  date: string;
  status: Status;
}[] = [
  {
    id: "REQ-1042",
    title: "Office chairs (x6)",
    amount: "RM 4,200",
    date: "12 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1041",
    title: "Standing desk converters (x4)",
    amount: "RM 3,100",
    date: "10 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1040",
    title: "Conference room projector",
    amount: "RM 5,800",
    date: "8 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1039",
    title: "Team laptop refresh",
    amount: "RM 18,500",
    date: "2 Jul 2026",
    status: "Approved",
  },
  {
    id: "REQ-1037",
    title: "Ergonomic keyboards (x10)",
    amount: "RM 1,950",
    date: "26 Jun 2026",
    status: "Approved",
  },
  {
    id: "REQ-1035",
    title: "Marketing print run",
    amount: "RM 2,750",
    date: "20 Jun 2026",
    status: "Rejected",
  },
  {
    id: "REQ-1033",
    title: "Pantry restock — June",
    amount: "RM 860",
    date: "15 Jun 2026",
    status: "Approved",
  },
];

const filters = ["All", "Pending", "Approved", "Rejected"] as const;

export function HistoryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  const visible = requisitions.filter(
    (req) =>
      (filter === "All" || req.status === filter) &&
      `${req.id} ${req.title}`.toLowerCase().includes(query.toLowerCase().trim()),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">My Requisitions</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Every request you've submitted, and where it stands.
            </p>
          </div>
          <RequestMenu />
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-full border border-foreground/10 p-1">
              {filters.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    filter === option
                      ? "bg-foreground text-background"
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requisitions"
                className="h-11 rounded-full pl-11"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">
                No requisitions match your filters.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map(({ id, title, amount, date, status }) => {
                const { icon: Icon, tone } = statusConfig[status];
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {id} · Submitted {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{amount}</span>
                      <span
                        className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {status}
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

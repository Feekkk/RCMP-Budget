import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Search,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "Pending" | "Approved" | "Rejected";

const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
  Pending: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Approved: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Rejected: { icon: XCircle, tone: "text-red-600 bg-red-100" },
};

type Requisition = {
  id: string;
  title: string;
  requester: string;
  amount: string;
  date: string;
  status: Status;
};

const initialRequisitions: Requisition[] = [
  {
    id: "REQ-1042",
    title: "Office chairs (x6)",
    requester: "Afiq Danial",
    amount: "RM 4,200",
    date: "14 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1041",
    title: "Projector for meeting room",
    requester: "Mei Ling Tan",
    amount: "RM 3,100",
    date: "13 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1040",
    title: "Quarterly stationery restock",
    requester: "Hafiz Rahman",
    amount: "RM 860",
    date: "12 Jul 2026",
    status: "Pending",
  },
  {
    id: "REQ-1039",
    title: "Team laptop refresh",
    requester: "Afiq Danial",
    amount: "RM 18,500",
    date: "2 Jul 2026",
    status: "Approved",
  },
  {
    id: "REQ-1035",
    title: "Marketing print run",
    requester: "Mei Ling Tan",
    amount: "RM 2,750",
    date: "20 Jun 2026",
    status: "Rejected",
  },
];

const filters = ["All", "Pending", "Approved", "Rejected"] as const;

export function ApprovalPage() {
  const [requisitions, setRequisitions] = useState(initialRequisitions);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [query, setQuery] = useState("");

  const review = (id: string, status: "Approved" | "Rejected") => {
    setRequisitions((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req)),
    );
    toast(`${id} ${status.toLowerCase()}`, {
      description:
        status === "Approved"
          ? "The requester has been notified and the request moves to Finance."
          : "The requester has been notified of the rejection.",
    });
  };

  const visible = requisitions.filter(
    (req) =>
      (filter === "All" || req.status === filter) &&
      `${req.id} ${req.title} ${req.requester}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );

  const pendingCount = requisitions.filter((r) => r.status === "Pending").length;

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">List Of Approvals</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {pendingCount === 0
              ? "You're all caught up — no budget requests waiting on you."
              : `${pendingCount} requisition${pendingCount === 1 ? "" : "s"} waiting for your review.`}
          </p>
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
              {visible.map(({ id, title, requester, amount, date, status }) => {
                const { icon: Icon, tone } = statusConfig[status];
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {id} · {requester} · Submitted {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium tabular-nums">
                        {amount}
                      </span>
                      {status === "Pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => review(id, "Approved")}
                            aria-label={`Approve ${id}`}
                            title="Approve"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:scale-105 hover:brightness-95"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => review(id, "Rejected")}
                            aria-label={`Reject ${id}`}
                            title="Reject"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:scale-105 hover:brightness-95"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {status}
                        </span>
                      )}
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

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ChevronRight } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getRequests, statusConfig, formatRM, requestTotal } from "./request-data";

const filters = ["All", "Pending", "Endorsed", "Rejected"] as const;

export function RequestPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [query, setQuery] = useState("");

  const requests = getRequests();

  const visible = requests.filter(
    (req) =>
      (filter === "All" || req.status === filter) &&
      `${req.id} ${req.title} ${req.department}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Budget Requests</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {pendingCount === 0
              ? "You're all caught up — no approved requests waiting for endorsement."
              : `${pendingCount} approved request${pendingCount === 1 ? "" : "s"} waiting for your endorsement.`}
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
                placeholder="Search requests"
                className="h-11 rounded-full pl-11"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">
                No requests match your filters.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map((request) => {
                const { id, title, department, date, status, items } = request;
                const { icon: Icon, tone } = statusConfig[status];
                return (
                  <li key={id}>
                    <Link
                      to="/finance/request/$id"
                      params={{ id }}
                      className="group -mx-3 flex flex-wrap items-center justify-between gap-4 rounded-xl px-3 py-4 transition hover:bg-ivory"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          {id} · {department} · {items.length} item
                          {items.length === 1 ? "" : "s"} · Approved {date}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium tabular-nums">
                          {formatRM(requestTotal(request))}
                        </span>
                        <span
                          className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
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

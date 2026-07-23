import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Truck,
  Search,
  FileSearch,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "Open" | "Quoted" | "Purchased";

const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
  Open: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Quoted: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Purchased: { icon: Truck, tone: "text-sky-700 bg-sky-100" },
};

type Quotation = {
  id: string;
  title: string;
  department: string;
  requester: string;
  items: number;
  date: string;
  status: Status;
};

const initialQuotations: Quotation[] = [
  {
    id: "QT-312",
    title: "Office chairs (x6)",
    department: "IT Department",
    requester: "Afiq Danial",
    items: 1,
    date: "14 Jul 2026",
    status: "Open",
  },
  {
    id: "QT-311",
    title: "Projector for meeting room",
    department: "IT Department",
    requester: "Mei Ling Tan",
    items: 1,
    date: "13 Jul 2026",
    status: "Open",
  },
  {
    id: "QT-310",
    title: "Quarterly stationery restock",
    department: "Human Resources",
    requester: "Hafiz Rahman",
    items: 8,
    date: "12 Jul 2026",
    status: "Open",
  },
  {
    id: "QT-309",
    title: "Team laptop refresh",
    department: "Operations",
    requester: "Afiq Danial",
    items: 4,
    date: "10 Jul 2026",
    status: "Open",
  },
  {
    id: "QT-308",
    title: "Annual software licenses",
    department: "Operations",
    requester: "Mei Ling Tan",
    items: 3,
    date: "2 Jul 2026",
    status: "Quoted",
  },
  {
    id: "QT-305",
    title: "Warehouse pallet jack",
    department: "Logistics",
    requester: "Hafiz Rahman",
    items: 1,
    date: "20 Jun 2026",
    status: "Purchased",
  },
];

const filters = ["All", "Open", "Quoted", "Purchased"] as const;

export function QuotationsPage() {
  const [quotations, setQuotations] = useState(initialQuotations);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Open");
  const [query, setQuery] = useState("");

  const visible = quotations.filter(
    (q) =>
      (filter === "All" || q.status === filter) &&
      `${q.id} ${q.title} ${q.department} ${q.requester}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );

  const openCount = quotations.filter((q) => q.status === "Open").length;

  const markQuoted = (id: string) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "Quoted" } : q)),
    );
    toast("Quotes attached", {
      description: `${id} is ready for HOD review.`,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Quotations</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {openCount === 0
              ? "You're all caught up — no open quotation requests."
              : `${openCount} request${openCount === 1 ? "" : "s"} waiting for vendor quotes.`}
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
                placeholder="Search quotations"
                className="h-11 rounded-full pl-11"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">
                No quotations match your filters.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map((quotation) => {
                const { icon: StatusIcon, tone } = statusConfig[quotation.status];
                return (
                  <li
                    key={quotation.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{quotation.title}</p>
                      <p className="text-xs text-foreground/50">
                        {quotation.id} · {quotation.department} · {quotation.requester} ·{" "}
                        {quotation.items} item{quotation.items === 1 ? "" : "s"} ·{" "}
                        {quotation.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                          tone,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {quotation.status}
                      </span>
                      {quotation.status === "Open" && (
                        <button
                          type="button"
                          onClick={() => markQuoted(quotation.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-medium text-lime-foreground transition hover:brightness-95"
                        >
                          <FileSearch className="h-3.5 w-3.5" />
                          Attach quotes
                        </button>
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

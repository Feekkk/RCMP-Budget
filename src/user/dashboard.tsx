import { Plus, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Sidebar } from "./sidebar";

const stats = [
  { label: "Department budget", value: "RM 120,000", hint: "FY 2026 allocation" },
  { label: "Spent to date", value: "RM 48,350", hint: "40% of allocation" },
  { label: "Pending approvals", value: "3", hint: "Awaiting HOD review" },
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
  return (
    <div className="flex min-h-screen bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Good morning, Alex</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Here's what's happening with your requisitions today.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            New requisition
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map(({ label, value, hint }) => (
            <div key={label} className="rounded-[1.5rem] bg-background p-6 shadow-card">
              <p className="text-sm text-foreground/60">{label}</p>
              <p className="mt-2 font-display text-3xl">{value}</p>
              <p className="mt-1 text-xs text-foreground/50">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent requisitions</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-foreground/60 transition hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
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

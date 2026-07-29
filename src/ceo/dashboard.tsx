import { FileCheck, Hourglass } from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Awaiting your review",
    value: "0",
    hint: "High-value requisitions",
    icon: Hourglass,
    featured: true,
  },
  {
    label: "Approved this month",
    value: "0",
    hint: "Executive sign-offs",
    icon: FileCheck,
  },
];

export function CeoDashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">CEO Dashboard</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Review high-value requisitions that need executive approval.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
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
              <p className="mt-4 font-display text-4xl">{value}</p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  featured ? "text-lime-foreground/70" : "text-foreground/50",
                )}
              >
                {hint}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

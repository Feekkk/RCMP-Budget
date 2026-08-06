import { Link, type LinkProps } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileCheck,
  Calendar,
  Settings,
  LogOut,
  FileChartColumn,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { cn } from "@/lib/utils";

const items: { label: string; icon: LucideIcon; to?: LinkProps["to"] }[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/hod" },
  { label: "Approvals", icon: FileCheck, to: "/hod/approval" },
  { label: "Calendar", icon: Calendar, to: "/hod/calendar" },
  { label: "Reports", icon: FileChartColumn, to: "/hod/reports" },
  { label: "Settings", icon: Settings, to: "/hod/settings" },
];

const itemClass =
  "inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition";
const inactiveClass = "text-foreground/60 hover:bg-ivory hover:text-foreground";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-foreground/10 bg-background p-6">
      <Wordmark />

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {items.map(({ label, icon: Icon, to }) =>
          to ? (
            <Link
              key={label}
              to={to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-lime text-lime-foreground" }}
              inactiveProps={{ className: inactiveClass }}
              className={itemClass}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ) : (
            <button key={label} type="button" className={cn(itemClass, inactiveClass)}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ),
        )}
      </nav>

      <div className="border-t border-foreground/10 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime font-display text-base text-lime-foreground">
            S
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Tun Hazman</p>
            <p className="truncate text-xs text-foreground/50">HOD · IT Department</p>
          </div>
          <Link
            to="/login"
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/60 transition hover:bg-ivory hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

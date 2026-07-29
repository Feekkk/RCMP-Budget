import { useState } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  LogOut,
  Menu,
  type LucideIcon,
  User,
} from "lucide-react";
import { Wordmark } from "@/components/landing/Nav";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const items: { label: string; icon: LucideIcon; to?: LinkProps["to"] }[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/user" },
  { label: "History", icon: FileText, to: "/user/history" },
  { label: "Calendar", icon: Calendar, to: "/user/calendar" },
  { label: "Account", icon: User, to: "/user/profile" },
];

const itemClass =
  "inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition";
const inactiveClass = "text-foreground/60 hover:bg-ivory hover:text-foreground";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
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
              onClick={onNavigate}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              className={cn(itemClass, inactiveClass)}
              onClick={onNavigate}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ),
        )}
      </nav>

      <div className="border-t border-foreground/10 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime font-display text-base text-lime-foreground">
            A
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Afiq Danial</p>
            <p className="truncate text-xs text-foreground/50">User · Technical 2</p>
          </div>
          <Link
            to="/login"
            aria-label="Log out"
            title="Log out"
            onClick={onNavigate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/60 transition hover:bg-ivory hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-foreground/10 bg-background px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:bg-ivory hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Wordmark />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-6 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Main navigation menu</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-foreground/10 bg-background p-6 md:flex">
        <SidebarNav />
      </aside>
    </>
  );
}

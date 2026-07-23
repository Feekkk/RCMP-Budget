import { Link } from "@tanstack/react-router";
import { ChevronDown, FileText, Plus, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RequestMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95 outline-none focus-visible:ring-2 focus-visible:ring-lime-foreground/30">
        <Plus className="h-4 w-4" />
        New request
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem] rounded-xl p-1.5">
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
          <Link to="/user/quotation">
            <FileText className="h-4 w-4" />
            Request Quotation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
          <Link to="/user/budget">
            <Wallet className="h-4 w-4" />
            Request Budget
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

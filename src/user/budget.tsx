import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "./sidebar";

export function BudgetPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <Link
          to="/user"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6">
          <h1 className="font-display text-4xl">Request Budget Allocation</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Submit a budget request for your department's approval workflow.
          </p>
        </div>
      </main>
    </div>
  );
}

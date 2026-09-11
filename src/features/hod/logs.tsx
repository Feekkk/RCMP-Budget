import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import {
  listHodBudgetLogs,
  type BudgetActionLog,
} from "@backend/server-functions/budget-log-fns";
import {
  BudgetLogList,
  filterBudgetLogs,
} from "@/features/budget-action-log-list";

export function HodLogsPage() {
  const [logs, setLogs] = useState<BudgetActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    listHodBudgetLogs()
      .then((rows) => {
        if (active) setLogs(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load logs. Refresh and try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleLogs = useMemo(
    () => filterBudgetLogs(logs, query),
    [logs, query],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Logs</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Department budget edits, transfers, deletions, and amount updates.
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs"
              className="h-11 rounded-full pl-11"
            />
          </div>
          <div className="mt-4">
            <BudgetLogList
              logs={visibleLogs}
              loading={loading}
              emptyMessage={
                logs.length === 0
                  ? "No budget logs yet for this department."
                  : "No logs match your search."
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/user/history";

export const Route = createFileRoute("/user/history")({
  head: () => ({
    meta: [
      { title: "History — Budget Tracker" },
      {
        name: "description",
        content:
          "Review quotations and department yearly budgets in one place.",
      },
    ],
  }),
  component: HistoryPage,
});

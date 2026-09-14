import { createFileRoute } from "@tanstack/react-router";
import { HistoryBudgetDetailPage } from "@/features/user/history";

export const Route = createFileRoute("/user/history/$budgetId")({
  head: () => ({
    meta: [
      { title: "Budget detail — Budget Tracker" },
      {
        name: "description",
        content: "View a yearly OPEX or CAPEX budget request.",
      },
    ],
  }),
  component: HistoryBudgetDetailRoute,
});

function HistoryBudgetDetailRoute() {
  const { budgetId } = Route.useParams();
  return <HistoryBudgetDetailPage budgetId={Number(budgetId)} />;
}

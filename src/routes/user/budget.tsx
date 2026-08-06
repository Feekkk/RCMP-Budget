import { createFileRoute } from "@tanstack/react-router";
import { BudgetFormPage } from "@/user/budgetForm";

export const Route = createFileRoute("/user/budget")({
  head: () => ({
    meta: [
      { title: "Yearly Budget — Budget Tracker" },
      {
        name: "description",
        content: "Submit your department's yearly OPEX and CAPEX budget request.",
      },
    ],
  }),
  component: BudgetFormPage,
});

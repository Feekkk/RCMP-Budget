import { createFileRoute } from "@tanstack/react-router";
import { BudgetPage } from "@/user/budget";

export const Route = createFileRoute("/user/budget")({
  head: () => ({
    meta: [
      { title: "Request Budget — Ledgerly" },
      {
        name: "description",
        content: "Submit a budget request for your department's approval workflow.",
      },
    ],
  }),
  component: BudgetPage,
});

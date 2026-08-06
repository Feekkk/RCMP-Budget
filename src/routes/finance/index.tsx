import { createFileRoute } from "@tanstack/react-router";
import { FinanceDashboard } from "@/finance/dashboard";

export const Route = createFileRoute("/finance/")({
  head: () => ({
    meta: [
      { title: "Finance Dashboard — Budget Tracker" },
      {
        name: "description",
        content: "Monitor company-wide spending and process approved PRF payments.",
      },
    ],
  }),
  component: FinanceDashboard,
});

import { createFileRoute } from "@tanstack/react-router";
import { CeoDashboard } from "@/features/ceo/dashboard";

export const Route = createFileRoute("/ceo/")({
  head: () => ({
    meta: [
      { title: "CEO Dashboard — Budget Tracker" },
      {
        name: "description",
        content: "Review high-value requisitions that need executive approval.",
      },
    ],
  }),
  component: CeoDashboard,
});

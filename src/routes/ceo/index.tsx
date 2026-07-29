import { createFileRoute } from "@tanstack/react-router";
import { CeoDashboard } from "@/ceo/dashboard";

export const Route = createFileRoute("/ceo/")({
  head: () => ({
    meta: [
      { title: "CEO Dashboard — Ledgerly" },
      {
        name: "description",
        content: "Review high-value requisitions that need executive approval.",
      },
    ],
  }),
  component: CeoDashboard,
});

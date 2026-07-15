import { createFileRoute } from "@tanstack/react-router";
import { RequestPage } from "@/finance/request";

export const Route = createFileRoute("/finance/request")({
  head: () => ({
    meta: [
      { title: "Budget Requests — Ledgerly" },
      {
        name: "description",
        content: "Review approved budget requests and process payments.",
      },
    ],
  }),
  component: RequestPage,
});

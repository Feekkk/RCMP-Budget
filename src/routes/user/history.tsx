import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/user/history";

export const Route = createFileRoute("/user/history")({
  head: () => ({
    meta: [
      { title: "My Requisitions — Ledgerly" },
      {
        name: "description",
        content: "Review the status and history of every requisition you've submitted.",
      },
    ],
  }),
  component: HistoryPage,
});

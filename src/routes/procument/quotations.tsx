import { createFileRoute } from "@tanstack/react-router";
import { QuotationsPage } from "@/features/procument/quotations";

export const Route = createFileRoute("/procument/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Budget Tracker" },
      {
        name: "description",
        content: "Review submitted quotation requests waiting for procurement.",
      },
    ],
  }),
  component: QuotationsPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { QuotationsPage } from "@/procument/quotations";

export const Route = createFileRoute("/procument/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Ledgerly" },
      {
        name: "description",
        content: "Review and attach vendor quotes for open procurement requests.",
      },
    ],
  }),
  component: QuotationsPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { QuotationPage } from "@/user/quotation";

export const Route = createFileRoute("/user/quotation")({
  head: () => ({
    meta: [
      { title: "Request Quotation — Ledgerly" },
      {
        name: "description",
        content: "Submit a quotation request for your department's approval workflow.",
      },
    ],
  }),
  component: QuotationPage,
});

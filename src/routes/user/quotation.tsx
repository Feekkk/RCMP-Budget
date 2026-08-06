import { createFileRoute } from "@tanstack/react-router";
import { QuotationPage } from "@/routes/quotation";

export const Route = createFileRoute("/user/quotation")({
  head: () => ({
    meta: [
      { title: "Request Quotation — Budget Tracker" },
      {
        name: "description",
        content: "Submit a quotation request for your department's approval workflow.",
      },
    ],
  }),
  component: QuotationPage,
});

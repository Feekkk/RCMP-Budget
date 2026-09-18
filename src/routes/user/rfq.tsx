import { createFileRoute } from "@tanstack/react-router";
import { RfqFormPage } from "@/features/user/rfqForm";

export const Route = createFileRoute("/user/rfq")({
  head: () => ({
    meta: [
      { title: "Generate RFQ — Budget Tracker" },
      {
        name: "description",
        content:
          "Build a Request for Quotation with item, quantity, unit price, and cost.",
      },
    ],
  }),
  component: RfqFormPage,
});

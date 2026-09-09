import { createFileRoute, redirect } from "@tanstack/react-router";
import { QuotationPage } from "@/features/user/quotation";

export const Route = createFileRoute("/user/quotation")({
  beforeLoad: () => {
    throw redirect({ to: "/user" });
  },
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

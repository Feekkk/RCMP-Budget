import { createFileRoute } from "@tanstack/react-router";
import { HodReportPage } from "@/features/hod/report";

export const Route = createFileRoute("/hod/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Budget Tracker" },
      {
        name: "description",
        content:
          "View department OPEX, CAPEX, and quotation requisition reports.",
      },
    ],
  }),
  component: HodReportPage,
});

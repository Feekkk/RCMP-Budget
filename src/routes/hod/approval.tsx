import { createFileRoute } from "@tanstack/react-router";
import { ApprovalPage } from "@/hod/approval";

export const Route = createFileRoute("/hod/approval")({
  head: () => ({
    meta: [
      { title: "Approvals — Budget Tracker" },
      {
        name: "description",
        content:
          "Approve or reject quotations and yearly budgets from your department.",
      },
    ],
  }),
  component: ApprovalPage,
});

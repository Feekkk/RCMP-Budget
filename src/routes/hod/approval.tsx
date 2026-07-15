import { createFileRoute } from "@tanstack/react-router";
import { ApprovalPage } from "@/hod/approval";

export const Route = createFileRoute("/hod/approval")({
  head: () => ({
    meta: [
      { title: "Approvals — Ledgerly" },
      {
        name: "description",
        content: "Approve or reject requisitions submitted by your department.",
      },
    ],
  }),
  component: ApprovalPage,
});

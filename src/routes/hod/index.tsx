import { createFileRoute } from "@tanstack/react-router";
import { HodDashboard } from "@/features/hod/dashboard";

export const Route = createFileRoute("/hod/")({
  head: () => ({
    meta: [
      { title: "HOD Dashboard — Budget Tracker" },
      {
        name: "description",
        content: "Review pending requisitions and monitor your department's budget.",
      },
    ],
  }),
  component: HodDashboard,
});

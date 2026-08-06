import { createFileRoute } from "@tanstack/react-router";
import { UserDashboard } from "@/user/dashboard";

export const Route = createFileRoute("/user/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Budget Tracker" },
      {
        name: "description",
        content: "Track your requisitions, PRFs, and department budget at a glance.",
      },
    ],
  }),
  component: UserDashboard,
});

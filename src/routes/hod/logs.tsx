import { createFileRoute } from "@tanstack/react-router";
import { HodLogsPage } from "@/features/hod/logs";

export const Route = createFileRoute("/hod/logs")({
  head: () => ({
    meta: [
      { title: "Logs — Budget Tracker" },
      {
        name: "description",
        content: "Review department yearly budget action logs.",
      },
    ],
  }),
  component: HodLogsPage,
});

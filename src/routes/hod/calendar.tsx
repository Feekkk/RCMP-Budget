import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/hod/calendar";

export const Route = createFileRoute("/hod/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Budget Tracker" },
      {
        name: "description",
        content: "Track approval deadlines, budget reviews, and department milestones.",
      },
    ],
  }),
  component: CalendarPage,
});

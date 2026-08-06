import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/user/calendar";

export const Route = createFileRoute("/user/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Budget Tracker" },
      {
        name: "description",
        content: "Track deadlines, reviews, and approval milestones for your department.",
      },
    ],
  }),
  component: CalendarPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/user/calendar";

export const Route = createFileRoute("/user/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Budget Tracker" },
      {
        name: "description",
        content: "Track department quotations and yearly budgets by date.",
      },
    ],
  }),
  component: CalendarPage,
});

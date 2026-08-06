import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/user/profile";

export const Route = createFileRoute("/user/profile")({
  head: () => ({
    meta: [
      { title: "Account — Budget Tracker" },
      {
        name: "description",
        content: "View your staff profile used across Budget Tracker.",
      },
    ],
  }),
  component: ProfilePage,
});

import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/user/profile";

export const Route = createFileRoute("/user/profile")({
  head: () => ({
    meta: [
      { title: "Account — Budget Tracker" },
      {
        name: "description",
        content:
          "Manage your personal details used on requisitions and purchase documents.",
      },
    ],
  }),
  component: ProfilePage,
});

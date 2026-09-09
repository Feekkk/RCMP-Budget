import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/user/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/user" });
  },
  component: () => null,
});

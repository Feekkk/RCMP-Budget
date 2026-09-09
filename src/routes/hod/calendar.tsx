import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hod/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/hod" });
  },
  component: () => null,
});

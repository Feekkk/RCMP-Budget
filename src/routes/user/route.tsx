import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/user")({
  beforeLoad: requireRole("User"),
  component: () => <Outlet />,
});

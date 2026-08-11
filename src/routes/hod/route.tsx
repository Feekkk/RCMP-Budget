import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/hod")({
  beforeLoad: requireRole("HOD"),
  component: () => <Outlet />,
});

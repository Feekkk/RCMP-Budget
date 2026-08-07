import { createFileRoute } from "@tanstack/react-router";
import { SystemSettingsPage } from "@/components/system-settings-page";
import { Sidebar } from "@/hod/sidebar";

export const Route = createFileRoute("/hod/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Budget Tracker" },
      {
        name: "description",
        content:
          "Manage system options and view department staff email and last login.",
      },
    ],
  }),
  component: () => (
    <SystemSettingsPage Sidebar={Sidebar} showDepartmentStaff />
  ),
});

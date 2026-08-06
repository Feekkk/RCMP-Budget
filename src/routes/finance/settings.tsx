import { createFileRoute } from "@tanstack/react-router";
import { SystemSettingsPage } from "@/components/system-settings-page";
import { Sidebar } from "@/finance/sidebar";

export const Route = createFileRoute("/finance/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Budget Tracker" },
      {
        name: "description",
        content: "View system settings configured for Budget Tracker.",
      },
    ],
  }),
  component: () => <SystemSettingsPage Sidebar={Sidebar} />,
});

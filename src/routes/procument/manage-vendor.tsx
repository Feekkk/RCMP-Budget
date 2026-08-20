import { createFileRoute } from "@tanstack/react-router";
import { ManageVendorPage } from "@/features/procument/manage-vendor";

export const Route = createFileRoute("/procument/manage-vendor")({
  head: () => ({
    meta: [
      { title: "Manage Vendor — Budget Tracker" },
      {
        name: "description",
        content: "View and manage registered vendors for procurement.",
      },
    ],
  }),
  component: ManageVendorPage,
});

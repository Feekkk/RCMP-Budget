import { createFileRoute } from "@tanstack/react-router";
import { ProcumentDashboard } from "@/procument/dashboard";

export const Route = createFileRoute("/procument/")({
  head: () => ({
    meta: [
      { title: "Procument Dashboard — Budget Tracker" },
      {
        name: "description",
        content: "Source vendor quotes and track open quotation requests.",
      },
    ],
  }),
  component: ProcumentDashboard,
});

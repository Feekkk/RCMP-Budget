import { createFileRoute } from "@tanstack/react-router";
import { DepartmentPage } from "@/user/department";

export const Route = createFileRoute("/user/department")({
  head: () => ({
    meta: [
      { title: "My Department — Budget Tracker" },
      {
        name: "description",
        content:
          "View your department OPEX, CAPEX, and quotation ledgers.",
      },
    ],
  }),
  component: DepartmentPage,
});

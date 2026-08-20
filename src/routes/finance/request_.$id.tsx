import { createFileRoute } from "@tanstack/react-router";
import { RequestDetailPage } from "@/features/finance/request-detail";

export const Route = createFileRoute("/finance/request_/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Budget Tracker` },
      {
        name: "description",
        content: "Review the budget request details and process payment.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <RequestDetailPage id={id} />;
}

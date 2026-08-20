import { createFileRoute } from "@tanstack/react-router";
import { VendorInviteForm } from "@/features/procument/vendor-invite-form";

export const Route = createFileRoute("/vendor-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Vendor Registration — Budget Tracker" },
      {
        name: "description",
        content: "Complete your vendor registration using your invite link.",
      },
    ],
  }),
  component: VendorInviteRoute,
});

function VendorInviteRoute() {
  const { token } = Route.useSearch();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-lg rounded-[1.5rem] bg-background p-8 text-center shadow-card">
          <h1 className="font-display text-3xl">Link unavailable</h1>
          <p className="mt-3 text-sm text-foreground/60">
            This registration link is missing. Ask procurement to send a new invite.
          </p>
          <p className="mt-4 text-sm text-foreground/60">
            Contact procurement at{" "}
            <a
              href="mailto:procument.rcmp@unikl.edu.my"
              className="font-medium text-foreground underline underline-offset-2"
            >
              procument.rcmp@unikl.edu.my
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <VendorInviteForm token={token} />;
}

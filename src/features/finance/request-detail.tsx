import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import {
  getRequest,
  updateRequestStatus,
  updateRequestItemPrice,
  statusConfig,
  formatRM,
  itemTotal,
  requestTotal,
  type Status,
} from "./request-data";

export function RequestDetailPage({ id }: { id: string }) {
  const [request, setRequest] = useState(() => getRequest(id));
  const [generating, setGenerating] = useState(false);

  if (!request) {
    return (
      <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center p-8">
          <p className="font-display text-3xl">Request not found</p>
          <Link
            to="/finance/request"
            className="mt-4 inline-flex items-center gap-2 text-sm text-foreground/60 transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to budget requests
          </Link>
        </main>
      </div>
    );
  }

  const { icon: StatusIcon, tone } = statusConfig[request.status];
  const editable = request.status === "Pending";

  const setPrice = (itemName: string, unitPrice: number) => {
    setRequest(updateRequestItemPrice(id, itemName, unitPrice));
  };

  const review = (status: Extract<Status, "Endorsed" | "Rejected">) => {
    setRequest(updateRequestStatus(id, status));
    toast(`${id} ${status === "Endorsed" ? "endorsed" : "rejected"}`, {
      description:
        status === "Endorsed"
          ? "The request has been endorsed and the requester has been notified."
          : "The requester has been notified of the rejection.",
    });
  };

  const generatePdf = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast(`${id} PDF ready`, {
        description: "The RFQ document has been generated.",
      });
    }, 4000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <Link
          to="/finance/request"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to budget requests
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">{request.title}</h1>
            <p className="mt-2 text-sm text-foreground/60">
              {request.id} · Approved {request.date}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${tone}`}
          >
            <StatusIcon className="h-4 w-4" />
            {request.status}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { label: "Department", value: request.department },
            { label: "Requested by", value: request.requester },
            { label: "Total amount", value: formatRM(requestTotal(request)) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[1.5rem] bg-background p-6 shadow-card">
              <p className="text-sm font-medium text-foreground/60">{label}</p>
              <p className="mt-2 font-display text-2xl">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <h2 className="font-display text-2xl">
            Items
            <span className="ml-2 text-base text-foreground/40">
              ({request.items.length})
            </span>
          </h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-xs text-foreground/50">
                <th className="py-3 font-medium">Item</th>
                <th className="py-3 text-right font-medium">Qty</th>
                <th className="py-3 text-right font-medium">Unit price</th>
                <th className="py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {request.items.map((item) => (
                <tr key={item.name}>
                  <td className="py-4 font-medium">{item.name}</td>
                  <td className="py-4 text-right tabular-nums text-foreground/60">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-right tabular-nums text-foreground/60">
                    {editable ? (
                      <div className="ml-auto flex w-32 items-center gap-1.5">
                        <span className="text-xs text-foreground/40">RM</span>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setPrice(item.name, Math.max(0, Number(e.target.value)))
                          }
                          className="h-9 rounded-lg text-right tabular-nums"
                        />
                      </div>
                    ) : (
                      formatRM(item.unitPrice)
                    )}
                  </td>
                  <td className="py-4 text-right font-medium tabular-nums">
                    {formatRM(itemTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-foreground/10">
                <td colSpan={3} className="py-4 text-right text-foreground/60">
                  Grand total
                </td>
                <td className="py-4 text-right font-display text-lg tabular-nums">
                  {formatRM(requestTotal(request))}
                </td>
              </tr>
            </tfoot>
          </table>

          {request.status !== "Rejected" && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-6">
            <button
              type="button"
              onClick={generatePdf}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-6 py-3 text-sm font-medium transition hover:bg-ivory"
            >
              <FileText className="h-4 w-4" />
              Generate RFQ
            </button>
            {request.status === "Pending" && (
              <>
                <button
                  type="button"
                  onClick={() => review("Endorsed")}
                  disabled={request.items.some((item) => item.unitPrice <= 0)}
                  title="Enter a unit price for every item first"
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => review("Rejected")}
                  className="inline-flex items-center gap-2 rounded-full bg-red-100 px-6 py-3 text-sm font-medium text-red-600 transition hover:brightness-95"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
          </div>
          )}
        </div>
      </main>

      {generating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ivory/90 backdrop-blur-sm">
          <DotLottieReact src="/pdf.json" loop autoplay className="h-52 w-52" />
          <p className="font-display text-2xl">Generating the Document</p>
          <p className="mt-2 text-sm text-foreground/60">
            Preparing the document…
          </p>
        </div>
      )}
    </div>
  );
}

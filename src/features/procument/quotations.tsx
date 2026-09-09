import { useEffect, useMemo, useState } from "react";
import { Clock, Eye, Paperclip, Search } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getProcumentQuotation,
  listSubmittedQuotations,
  type ProcumentQuotationDetail,
  type ProcumentQuotationListItem,
} from "@backend/server-functions/procument-quotation-fns";

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<ProcumentQuotationListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProcumentQuotationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await listSubmittedQuotations();
        if (!cancelled) setQuotations(rows);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load quotations. Refresh and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);

    getProcumentQuotation({ data: { quotationId: selectedId } })
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not open this quotation. Try again.",
          );
          setSelectedId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const visible = useMemo(() => {
    const search = query.toLowerCase().trim();
    if (!search) return quotations;
    return quotations.filter((quotation) =>
      `${quotation.id} ${quotation.title} ${quotation.department} ${quotation.requester}`
        .toLowerCase()
        .includes(search),
    );
  }, [query, quotations]);

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Quotations</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {loading
              ? "Loading submitted quotations…"
              : quotations.length === 0
                ? "No submitted quotations waiting for review."
                : `${quotations.length} submitted quotation${quotations.length === 1 ? "" : "s"} waiting for review.`}
          </p>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Submitted
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search quotations"
                className="h-11 rounded-full pl-11"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">Loading quotations…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-14 text-center">
              <p className="text-sm text-foreground/50">
                {query.trim()
                  ? "No quotations match your search."
                  : "No submitted quotations yet."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map((quotation) => (
                <li key={quotation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(quotation.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{quotation.title}</p>
                      <p className="text-xs text-foreground/50">
                        QT-{quotation.id} · {quotation.department} · {quotation.requester} ·{" "}
                        {quotation.itemCount} item{quotation.itemCount === 1 ? "" : "s"} ·{" "}
                        {quotation.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums">
                        {formatRm(quotation.amount)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ivory px-3 py-1.5 text-xs font-medium text-foreground/70">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialog
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">
              {detail ? `QT-${detail.id}` : "Quotation"}
            </DialogTitle>
            <DialogDescription>
              {loadingDetail
                ? "Loading quotation details…"
                : detail
                  ? `Submitted ${detail.date} · ${detail.department}`
                  : "Submitted quotation details"}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail || !detail ? (
            <p className="py-10 text-center text-sm text-foreground/50">
              Loading quotation details…
            </p>
          ) : (
            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-ivory p-4">
                  <p className="text-xs text-foreground/50">Requester</p>
                  <p className="mt-1 truncate text-sm font-medium">{detail.requester}</p>
                  {detail.designation && (
                    <p className="mt-0.5 truncate text-xs text-foreground/45">
                      {detail.designation}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-ivory p-4">
                  <p className="text-xs text-foreground/50">Items</p>
                  <p className="mt-1 font-display text-2xl tabular-nums">
                    {detail.items.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-ivory p-4">
                  <p className="text-xs text-foreground/50">Total</p>
                  <p className="mt-1 font-display text-2xl tabular-nums">
                    {formatRm(detail.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-display text-xl">Items</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10 text-left text-xs text-foreground/50">
                        <th className="py-3 font-medium">Item</th>
                        <th className="py-3 text-right font-medium">Qty</th>
                        <th className="py-3 text-right font-medium">Unit price</th>
                        <th className="py-3 text-right font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3">
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-foreground/50">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                          <td className="py-3 text-right tabular-nums">
                            {formatRm(item.price)}
                          </td>
                          <td className="py-3 text-right font-medium tabular-nums">
                            {formatRm(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detail.attachments.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-display text-xl">Attachments</h3>
                  <ul className="mt-3 space-y-2">
                    {detail.attachments.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center gap-2 rounded-xl bg-ivory px-4 py-3 text-sm"
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-foreground/50" />
                        <span className="truncate">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

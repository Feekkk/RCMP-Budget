import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  ClipboardPen,
  FileSpreadsheet,
  ChevronDown,
  Paperclip,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getMyQuotation,
  listMyQuotations,
  type QuotationDetail,
  type QuotationListItem,
} from "@/lib/quotation-fns";
import {
  generatePurchaseRequisition,
  type PurchaseRequisitionFormat,
} from "@/lib/prf-generator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function downloadPurchaseRequisitionFile(result: {
  fileName: string;
  data: string;
}) {
  const bytes = Uint8Array.from(atob(result.data), (char) =>
    char.charCodeAt(0),
  );
  const blob = new Blob([bytes], {
    type: result.fileName.endsWith(".pdf")
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

type Status = "Pending" | "Approved" | "Rejected";

const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
  Pending: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Approved: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Rejected: { icon: XCircle, tone: "text-red-600 bg-red-100" },
};

const filters = ["All", "Pending", "Approved", "Rejected"] as const;

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function HistoryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generatingPrfId, setGeneratingPrfId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    listMyQuotations()
      .then((rows) => {
        if (active) setQuotations(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load quotations. Please try again later.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }

    let active = true;
    setDetailLoading(true);
    getMyQuotation({ data: { quotationId: selectedId } })
      .then((row) => {
        if (active) setDetail(row);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load quotation. Please try again later.",
        );
        setSelectedId(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const visible = quotations.filter(
    (req) =>
      (filter === "All" || req.status === filter) &&
      `QT-${req.id} ${req.title}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );

  const generateRfq = (id: number) => {
    toast("Generate RFQ", {
      description: `RFQ for QT-${id} will be available once document generation is connected. Please try again later.`,
    });
  };

  const generatePrf = async (id: number, format: PurchaseRequisitionFormat) => {
    if (generatingPrfId != null) return;
    setGeneratingPrfId(id);
    const toastId = toast.loading(`Generating PRF for QT-${id}…`);
    try {
      const result = await generatePurchaseRequisition({
        data: { quotationId: id, format },
      });
      downloadPurchaseRequisitionFile(result);
      toast.success(`PRF for QT-${id} downloaded.`, { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to generate PRF for QT-${id}. Please try again later.`,
        { id: toastId },
      );
    } finally {
      setGeneratingPrfId(null);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">My Requisitions</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Every quotation you've submitted, and where it stands.
            </p>
          </div>
          <Link
            to="/user/quotation"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            Request Quotation
          </Link>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-full border border-foreground/10 p-1">
              {filters.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    filter === option
                      ? "bg-foreground text-background"
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
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
                {quotations.length === 0
                  ? "No quotations yet. Submit your first request."
                  : "No quotations match your filters."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-foreground/10">
              {visible.map(({ id, title, amount, date, status, itemCount }) => {
                const { icon: Icon, tone } = statusConfig[status];
                return (
                  <li key={id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(id);
                        }
                      }}
                      className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:bg-ivory/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          QT-{id} · {itemCount} item
                          {itemCount === 1 ? "" : "s"} · Submitted {date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {formatRm(amount)}
                        </span>
                        <span
                          className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {status}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {selectedId != null &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
            onClick={closeDetail}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="quotation-detail-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-background p-6 shadow-card md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading || !detail ? (
                <p className="py-12 text-center text-sm text-foreground/50">
                  Loading quotation details
                </p>
              ) : (
                <QuotationDetailCard
                  detail={detail}
                  onClose={closeDetail}
                  onGenerateRfq={() => generateRfq(detail.id)}
                  onGeneratePrf={(format) => void generatePrf(detail.id, format)}
                  generatingPrf={generatingPrfId === detail.id}
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function QuotationDetailCard({
  detail,
  onClose,
  onGenerateRfq,
  onGeneratePrf,
  generatingPrf,
}: {
  detail: QuotationDetail;
  onClose: () => void;
  onGenerateRfq: () => void;
  onGeneratePrf: (format: PurchaseRequisitionFormat) => void;
  generatingPrf: boolean;
}) {
  const { icon: StatusIcon, tone } = statusConfig[detail.status];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Quotation detail
          </p>
          <h2
            id="quotation-detail-title"
            className="mt-1 font-display text-3xl"
          >
            QT-{detail.id}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Submitted {detail.date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {detail.status}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-ivory hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-ivory p-4">
          <p className="text-xs text-foreground/50">Items</p>
          <p className="mt-1 font-display text-2xl tabular-nums">
            {detail.items.length}
          </p>
        </div>
        <div className="rounded-2xl bg-ivory p-4">
          <p className="text-xs text-foreground/50">Attachments</p>
          <p className="mt-1 font-display text-2xl tabular-nums">
            {detail.attachments.length}
          </p>
        </div>
        <div className="rounded-2xl bg-ivory p-4">
          <p className="text-xs text-foreground/50">Total</p>
          <p className="mt-1 font-display text-2xl tabular-nums">
            {formatRm(detail.amount)}
          </p>
        </div>
      </div>

      <div className="mt-8">
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
        <div className="mt-8">
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

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-6">
        <button
          type="button"
          onClick={onGenerateRfq}
          className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium transition hover:bg-ivory"
        >
          <FileText className="h-4 w-4" />
          Generate RFQ
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={generatingPrf}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium transition hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardPen className="h-4 w-4" />
              {generatingPrf ? "Generating…" : "Generate PRF"}
              <ChevronDown className="h-4 w-4 text-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="z-[110]">
            <DropdownMenuItem onClick={() => onGeneratePrf("pdf")}>
              <FileText className="h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGeneratePrf("xlsx")}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

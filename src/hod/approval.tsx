import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Search,
  Paperclip,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getHodQuotation,
  getHodQuotationAttachment,
  listHodQuotations,
  reviewHodQuotation,
  type HodQuotationDetail,
  type HodQuotationListItem,
} from "@/lib/hod-quotation-fns";
import {
  getHodBudget,
  listHodBudgets,
  reviewHodBudget,
  type HodBudgetDetail,
  type HodBudgetListItem,
} from "@/lib/hod-budget-fns";

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

type AttachmentPreview = {
  fileName: string;
  mimeType: string;
  url: string;
};

export function ApprovalPage() {
  const [tab, setTab] = useState<"quotations" | "budgets">("quotations");
  const [requisitions, setRequisitions] = useState<HodQuotationListItem[]>([]);
  const [budgets, setBudgets] = useState<HodBudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [query, setQuery] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(
    null,
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [quotationDetail, setQuotationDetail] =
    useState<HodQuotationDetail | null>(null);
  const [budgetDetail, setBudgetDetail] = useState<HodBudgetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listHodQuotations(), listHodBudgets()])
      .then(([quotationRows, budgetRows]) => {
        if (!active) return;
        setRequisitions(quotationRows);
        setBudgets(budgetRows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load approvals. Refresh and try again.",
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
    if (selectedQuotationId == null) {
      setQuotationDetail(null);
      return;
    }

    let active = true;
    setDetailLoading(true);
    getHodQuotation({ data: { quotationId: selectedQuotationId } })
      .then((row) => {
        if (active) setQuotationDetail(row);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open this quotation. Try again.",
        );
        setSelectedQuotationId(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedQuotationId]);

  useEffect(() => {
    if (selectedBudgetId == null) {
      setBudgetDetail(null);
      return;
    }

    let active = true;
    setDetailLoading(true);
    getHodBudget({ data: { budgetId: selectedBudgetId } })
      .then((row) => {
        if (active) setBudgetDetail(row);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open this budget. Try again.",
        );
        setSelectedBudgetId(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBudgetId]);

  const closeDetail = () => {
    setSelectedQuotationId(null);
    setSelectedBudgetId(null);
    setQuotationDetail(null);
    setBudgetDetail(null);
  };

  const reviewQuotation = async (
    id: number,
    decision: "Approved" | "Rejected",
  ) => {
    const key = `qt-${id}`;
    if (reviewingKey != null) return;
    setReviewingKey(key);
    const toastId = toast.loading(
      decision === "Approved"
        ? `Approving QT-${id}…`
        : `Rejecting QT-${id}…`,
    );
    try {
      const updated = await reviewHodQuotation({
        data: { quotationId: id, decision },
      });
      setRequisitions((prev) =>
        prev.map((req) => (req.id === id ? updated : req)),
      );
      if (quotationDetail?.id === id) {
        setQuotationDetail((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
                statusName: updated.statusName,
              }
            : prev,
        );
      }
      toast.success(`QT-${id} ${decision.toLowerCase()}`, {
        id: toastId,
        description:
          decision === "Approved"
            ? "The request can continue to the next step."
            : "The requester can see this rejection in their history.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not update QT-${id}. Try again.`,
        { id: toastId },
      );
    } finally {
      setReviewingKey(null);
    }
  };

  const reviewBudget = async (
    id: number,
    decision: "Approved" | "Rejected",
  ) => {
    const key = `yb-${id}`;
    if (reviewingKey != null) return;
    setReviewingKey(key);
    const toastId = toast.loading(
      decision === "Approved"
        ? `Approving YB-${id}…`
        : `Rejecting YB-${id}…`,
    );
    try {
      const updated = await reviewHodBudget({
        data: { budgetId: id, decision },
      });
      setBudgets((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      );
      if (budgetDetail?.id === id) {
        setBudgetDetail((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
                statusName: updated.statusName,
              }
            : prev,
        );
      }
      toast.success(`YB-${id} ${decision.toLowerCase()}`, {
        id: toastId,
        description:
          decision === "Approved"
            ? "This budget line is marked as approved."
            : "The requester can see this rejection in their history.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not update YB-${id}. Try again.`,
        { id: toastId },
      );
    } finally {
      setReviewingKey(null);
    }
  };

  const visibleQuotations = useMemo(
    () =>
      requisitions.filter(
        (req) =>
          (filter === "All" || req.status === filter) &&
          `QT-${req.id} ${req.title} ${req.requester}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [requisitions, filter, query],
  );

  const visibleBudgets = useMemo(
    () =>
      budgets.filter(
        (row) =>
          (filter === "All" || row.status === filter) &&
          `YB-${row.id} ${row.title} ${row.code} ${row.budgetType} ${row.budgetYear} ${row.requester}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [budgets, filter, query],
  );

  const pendingQuotations = requisitions.filter(
    (r) => r.status === "Pending",
  ).length;
  const pendingBudgets = budgets.filter((r) => r.status === "Pending").length;
  const pendingCount = pendingQuotations + pendingBudgets;

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">List Of Approvals</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {loading
              ? "Loading approvals…"
              : pendingCount === 0
                ? "You're all caught up — nothing waiting on you."
                : `${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting for your review.`}
          </p>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as "quotations" | "budgets");
              setFilter("Pending");
              setQuery("");
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TabsList className="h-auto rounded-full border border-foreground/10 bg-ivory p-1">
                <TabsTrigger
                  value="quotations"
                  className="rounded-full px-4 py-2 data-[state=active]:bg-background"
                >
                  Quotations
                  {pendingQuotations > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 tabular-nums">
                      {pendingQuotations}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="budgets"
                  className="rounded-full px-4 py-2 data-[state=active]:bg-background"
                >
                  Yearly budgets
                  {pendingBudgets > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 tabular-nums">
                      {pendingBudgets}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    tab === "quotations"
                      ? "Search quotations"
                      : "Search budgets"
                  }
                  className="h-11 rounded-full pl-11"
                />
              </div>
            </div>

            <div className="mt-4 flex w-fit items-center gap-1 rounded-full border border-foreground/10 p-1">
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

            <TabsContent value="quotations" className="mt-4">
              {loading ? (
                <p className="text-sm text-foreground/50">Loading quotations…</p>
              ) : visibleQuotations.length === 0 ? (
                <EmptyState message="No quotations match your filters." />
              ) : (
                <ul className="divide-y divide-foreground/10">
                  {visibleQuotations.map((req) => {
                    const { icon: Icon, tone } = statusConfig[req.status];
                    return (
                      <li key={req.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedQuotationId(req.id)}
                          className="flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:bg-ivory/60"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-ivory px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-foreground/60 uppercase">
                                Quotation
                              </span>
                              <p className="truncate text-sm font-medium">
                                {req.title}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-foreground/50">
                              QT-{req.id} · {req.requester} · Submitted{" "}
                              {req.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium tabular-nums">
                              {formatRm(req.amount)}
                            </span>
                            {req.status === "Pending" ? (
                              <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-full bg-ivory px-3 py-1 text-xs font-medium text-foreground/60">
                                View
                              </span>
                            ) : (
                              <span
                                className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {req.status}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="budgets" className="mt-4">
              {loading ? (
                <p className="text-sm text-foreground/50">
                  Loading department budgets…
                </p>
              ) : visibleBudgets.length === 0 ? (
                <EmptyState message="No yearly budgets match your filters." />
              ) : (
                <ul className="divide-y divide-foreground/10">
                  {visibleBudgets.map((row) => {
                    const { icon: Icon, tone } = statusConfig[row.status];
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedBudgetId(row.id)}
                          className="flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:bg-ivory/60"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
                                  row.budgetType === "OPEX"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-amber-100 text-amber-800",
                                )}
                              >
                                {row.budgetType}
                              </span>
                              <p className="truncate text-sm font-medium">
                                {row.title}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-foreground/50">
                              YB-{row.id} · FY {row.budgetYear} · {row.code} ·{" "}
                              {row.requester} · {row.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium tabular-nums">
                              {formatRm(row.amount)}
                            </span>
                            {row.status === "Pending" ? (
                              <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-full bg-ivory px-3 py-1 text-xs font-medium text-foreground/60">
                                View
                              </span>
                            ) : (
                              <span
                                className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {row.status}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedQuotationId != null &&
        createPortal(
          <DetailOverlay onClose={closeDetail}>
            {detailLoading || !quotationDetail ? (
              <p className="py-12 text-center text-sm text-foreground/50">
                Loading requisition details…
              </p>
            ) : (
              <QuotationApprovalCard
                detail={quotationDetail}
                reviewing={reviewingKey === `qt-${quotationDetail.id}`}
                onClose={closeDetail}
                onApprove={() =>
                  void reviewQuotation(quotationDetail.id, "Approved")
                }
                onReject={() =>
                  void reviewQuotation(quotationDetail.id, "Rejected")
                }
              />
            )}
          </DetailOverlay>,
          document.body,
        )}

      {selectedBudgetId != null &&
        createPortal(
          <DetailOverlay onClose={closeDetail}>
            {detailLoading || !budgetDetail ? (
              <p className="py-12 text-center text-sm text-foreground/50">
                Loading budget details…
              </p>
            ) : (
              <BudgetApprovalCard
                detail={budgetDetail}
                reviewing={reviewingKey === `yb-${budgetDetail.id}`}
                onClose={closeDetail}
                onApprove={() =>
                  void reviewBudget(budgetDetail.id, "Approved")
                }
                onReject={() =>
                  void reviewBudget(budgetDetail.id, "Rejected")
                }
              />
            )}
          </DetailOverlay>,
          document.body,
        )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-foreground/15 py-14 text-center">
      <p className="text-sm text-foreground/50">{message}</p>
    </div>
  );
}

function DetailOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-background p-6 shadow-card md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ReviewActions({
  reviewing,
  onApprove,
  onReject,
}: {
  reviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-6">
      <button
        type="button"
        onClick={onApprove}
        disabled={reviewing}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2.5 text-sm font-medium text-emerald-700 transition hover:brightness-95 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {reviewing ? "Updating…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={reviewing}
        className="inline-flex items-center gap-2 rounded-full bg-red-100 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:brightness-95 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        Reject
      </button>
    </div>
  );
}

function QuotationApprovalCard({
  detail,
  reviewing,
  onClose,
  onApprove,
  onReject,
}: {
  detail: HodQuotationDetail;
  reviewing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { icon: StatusIcon, tone } = statusConfig[detail.status];
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const closePreview = () => {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const viewAttachment = async (attachmentId: number) => {
    if (openingId != null) return;
    setOpeningId(attachmentId);
    const toastId = toast.loading("Loading attachment…");
    try {
      const result = await getHodQuotationAttachment({
        data: { attachmentId },
      });
      const bytes = Uint8Array.from(atob(result.data), (char) =>
        char.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      setPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return {
          fileName: result.fileName,
          mimeType: result.mimeType,
          url,
        };
      });
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open this file. Try again.",
        { id: toastId },
      );
    } finally {
      setOpeningId(null);
    }
  };

  const isImage = preview?.mimeType.startsWith("image/");
  const isPdf = preview?.mimeType === "application/pdf";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Quotation detail
          </p>
          <h2 className="mt-1 font-display text-3xl">QT-{detail.id}</h2>
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

      <div className="mt-6 rounded-2xl bg-ivory p-4">
        <p className="text-xs text-foreground/50">Requester</p>
        <p className="mt-1 text-sm font-medium">{detail.requester}</p>
        <p className="mt-0.5 text-xs text-foreground/50">
          {[detail.designation, detail.department].filter(Boolean).join(" · ") ||
            "No designation or department set"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => void viewAttachment(file.id)}
                  disabled={openingId != null}
                  className="flex w-full items-center gap-2 rounded-xl bg-ivory px-4 py-3 text-left text-sm transition hover:bg-ivory/70 disabled:opacity-60"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-foreground/50" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <Eye className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.status === "Pending" && (
        <ReviewActions
          reviewing={reviewing}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}

      {preview &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={closePreview}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={preview.fileName}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] bg-background shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
                <p className="truncate text-sm font-medium">{preview.fileName}</p>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Close preview"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-ivory hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-ivory p-4">
                {isImage ? (
                  <img
                    src={preview.url}
                    alt={preview.fileName}
                    className="max-h-[75vh] max-w-full object-contain"
                  />
                ) : isPdf ? (
                  <iframe
                    src={preview.url}
                    title={preview.fileName}
                    className="h-[75vh] w-full rounded-xl bg-background"
                  />
                ) : (
                  <p className="text-sm text-foreground/50">
                    Preview is only available for images and PDFs.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function BudgetApprovalCard({
  detail,
  reviewing,
  onClose,
  onApprove,
  onReject,
}: {
  detail: HodBudgetDetail;
  reviewing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { icon: StatusIcon, tone } = statusConfig[detail.status];
  const title =
    detail.budgetType === "CAPEX"
      ? detail.itemName || "Capital expenditure"
      : detail.activity || "Operating expenditure";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Yearly budget · {detail.budgetType}
          </p>
          <h2 className="mt-1 font-display text-3xl">YB-{detail.id}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            FY {detail.budgetYear} · Submitted {detail.date}
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

      <div className="mt-6 rounded-2xl bg-ivory p-4">
        <p className="text-xs text-foreground/50">Requester</p>
        <p className="mt-1 text-sm font-medium">{detail.requester}</p>
        <p className="mt-0.5 text-xs text-foreground/50">
          {[detail.designation, detail.department].filter(Boolean).join(" · ") ||
            "No designation or department set"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-ivory p-4 sm:col-span-2">
          <p className="text-xs text-foreground/50">Title</p>
          <p className="mt-1 text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-foreground/50">{detail.code}</p>
        </div>
        <div className="rounded-2xl bg-ivory p-4">
          <p className="text-xs text-foreground/50">Amount</p>
          <p className="mt-1 font-display text-2xl tabular-nums">
            {formatRm(detail.amount)}
          </p>
        </div>
      </div>

      <dl className="mt-6 space-y-4">
        {detail.targetMonths && (
          <DetailField label="Target months" value={detail.targetMonths} />
        )}
        {detail.objective && (
          <DetailField label="Objective" value={detail.objective} />
        )}
        <DetailField label="Justification" value={detail.justification} />
        {detail.budgetType === "CAPEX" && (
          <>
            {detail.quantity != null && (
              <DetailField label="Quantity" value={String(detail.quantity)} />
            )}
            {detail.costPerUnit != null && (
              <DetailField
                label="Cost per unit"
                value={formatRm(detail.costPerUnit)}
              />
            )}
            {detail.effectIfNotApproved && (
              <DetailField
                label="Effect if not approved"
                value={detail.effectIfNotApproved}
              />
            )}
            {detail.alternative && (
              <DetailField label="Alternative" value={detail.alternative} />
            )}
          </>
        )}
        {detail.remarks && (
          <DetailField label="Remarks" value={detail.remarks} />
        )}
      </dl>

      {detail.status === "Pending" && (
        <ReviewActions
          reviewing={reviewing}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">
        {value}
      </dd>
    </div>
  );
}

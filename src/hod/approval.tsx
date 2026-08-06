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
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  transferHodBudget,
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

const CAPEX_CODES = [
  { value: "200-1100", label: "200-1100 : Renovation" },
  { value: "200-1000", label: "200-1000 : Office equipment" },
  { value: "200-0500", label: "200-0500 : IT & audio visual" },
] as const;

const OPEX_CODES = [
  { value: "926-0000", label: "926-0000 Lease line for IT system" },
  { value: "916-0000", label: "916-0000 Equip. rental" },
  { value: "999-1003", label: "999-1003 Printing exp-meter reading" },
  { value: "992-0000", label: "992-0000 IT & audio visual - expenses" },
  { value: "923-0000", label: "923-0000 IT & audio-repair & maintenance" },
] as const;

type TransferBudgetInput =
  | {
      targetType: "CAPEX";
      code: (typeof CAPEX_CODES)[number]["value"];
      itemName: string;
      justification: string;
      targetMonths?: string;
      quantity: number;
      costPerUnit: number;
      budgetAmount: number;
      effectIfNotApproved?: string;
      alternative?: string;
      remarks?: string;
    }
  | {
      targetType: "OPEX";
      code: (typeof OPEX_CODES)[number]["value"];
      activity: string;
      objective: string;
      justification: string;
      targetMonths?: string;
      budgetAmount: number;
      remarks?: string;
    };

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
    setQuotationDetail(null);
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
    rejectRemarks?: string,
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
        data: { budgetId: id, decision, rejectRemarks },
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
                rejectRemarks:
                  decision === "Rejected"
                    ? rejectRemarks?.trim() || null
                    : prev.rejectRemarks,
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

  const transferBudget = async (id: number, payload: TransferBudgetInput) => {
    const key = `yb-${id}`;
    if (reviewingKey != null) return;
    setReviewingKey(key);
    const toastId = toast.loading(
      `Transferring YB-${id} to ${payload.targetType}…`,
    );
    try {
      const updated = await transferHodBudget({
        data: { budgetId: id, ...payload },
      });
      setBudgets((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      );
      if (budgetDetail?.id === id) {
        setBudgetDetail((prev) => {
          if (!prev) return prev;
          if (payload.targetType === "CAPEX") {
            return {
              ...prev,
              budgetType: "CAPEX",
              code: payload.code,
              activity: null,
              itemName: payload.itemName,
              targetMonths: payload.targetMonths || null,
              objective: null,
              justification: payload.justification,
              quantity: payload.quantity,
              costPerUnit: payload.costPerUnit,
              amount: payload.budgetAmount,
              effectIfNotApproved: payload.effectIfNotApproved || null,
              alternative: payload.alternative || null,
              remarks: payload.remarks || null,
              rejectRemarks: null,
              status: "Approved",
              statusName: "approved budget",
            };
          }
          return {
            ...prev,
            budgetType: "OPEX",
            code: payload.code,
            activity: payload.activity,
            itemName: null,
            targetMonths: payload.targetMonths || null,
            objective: payload.objective,
            justification: payload.justification,
            quantity: null,
            costPerUnit: null,
            amount: payload.budgetAmount,
            effectIfNotApproved: null,
            alternative: null,
            remarks: payload.remarks || null,
            rejectRemarks: null,
            status: "Approved",
            statusName: "approved budget",
          };
        });
      }
      toast.success(`YB-${id} transferred to ${payload.targetType}`, {
        id: toastId,
        description: `This budget is now approved under ${payload.targetType}.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not transfer YB-${id}. Try again.`,
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
                            <span
                              className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {req.status}
                            </span>
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
                <Accordion
                  type="single"
                  collapsible
                  value={
                    selectedBudgetId != null ? String(selectedBudgetId) : ""
                  }
                  onValueChange={(value) => {
                    setSelectedBudgetId(value ? Number(value) : null);
                  }}
                  className="divide-y divide-foreground/10"
                >
                  {visibleBudgets.map((row) => {
                    const { icon: Icon, tone } = statusConfig[row.status];
                    const isOpen = selectedBudgetId === row.id;
                    return (
                      <AccordionItem
                        key={row.id}
                        value={String(row.id)}
                        className="border-0"
                      >
                        <AccordionTrigger className="gap-4 py-4 hover:bg-ivory/60 hover:no-underline">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 pr-2">
                            <div className="min-w-0 text-left">
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
                              <p className="mt-1 text-xs font-normal text-foreground/50">
                                YB-{row.id} · FY {row.budgetYear} · {row.code} ·{" "}
                                {row.requester} · {row.date}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium tabular-nums">
                                {formatRm(row.amount)}
                              </span>
                              <span
                                className={`inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {row.status}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6">
                          {isOpen &&
                            (detailLoading ||
                            !budgetDetail ||
                            budgetDetail.id !== row.id ? (
                              <p className="py-4 text-sm text-foreground/50">
                                Loading budget details…
                              </p>
                            ) : (
                              <BudgetApprovalCard
                                detail={budgetDetail}
                                reviewing={
                                  reviewingKey === `yb-${budgetDetail.id}`
                                }
                                onApprove={() =>
                                  void reviewBudget(
                                    budgetDetail.id,
                                    "Approved",
                                  )
                                }
                                onReject={(rejectRemarks) =>
                                  void reviewBudget(
                                    budgetDetail.id,
                                    "Rejected",
                                    rejectRemarks,
                                  )
                                }
                                onTransfer={(payload) =>
                                  void transferBudget(budgetDetail.id, payload)
                                }
                              />
                            ))}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
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
  onApprove,
  onReject,
  onTransfer,
}: {
  detail: HodBudgetDetail;
  reviewing: boolean;
  onApprove: () => void;
  onReject: (rejectRemarks: string) => void;
  onTransfer: (payload: TransferBudgetInput) => void;
}) {
  const isCapex = detail.budgetType === "CAPEX";
  const canTransfer = detail.status === "Pending";
  const [rejecting, setRejecting] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const rejectId = `budget-reject-remarks-${detail.id}`;

  useEffect(() => {
    if (detail.status !== "Pending") {
      setTransferOpen(false);
      setRejecting(false);
    }
  }, [detail.status]);

  const fields: { label: string; value: string }[] = [
    {
      label: "Requester",
      value: detail.requester,
    },
    ...(isCapex
      ? [
          { label: "Item", value: detail.itemName || "-" },
          {
            label: "Quantity",
            value: detail.quantity == null ? "-" : String(detail.quantity),
          },
          {
            label: "Cost per unit",
            value:
              detail.costPerUnit == null
                ? "-"
                : formatRm(detail.costPerUnit),
          },
          { label: "Estimated price", value: formatRm(detail.amount) },
          {
            label: "Category",
            value: budgetCodeLabel(detail.code, detail.budgetType),
          },
          { label: "Justification", value: detail.justification },
          {
            label: "Target months",
            value: formatTargetMonth(detail.targetMonths),
          },
          {
            label: "Effect if not approved",
            value: detail.effectIfNotApproved || "-",
          },
          {
            label: "Alternative",
            value: detail.alternative || "-",
          },
        ]
      : [
          {
            label: "Activity",
            value: detail.activity || "-",
          },
          { label: "Budget", value: formatRm(detail.amount) },
          {
            label: "Code",
            value: budgetCodeLabel(detail.code, detail.budgetType),
          },
          {
            label: "Target months",
            value: formatTargetMonth(detail.targetMonths),
          },
          { label: "Objectives", value: detail.objective || "-" },
          { label: "Justification", value: detail.justification },
        ]),
    { label: "Remarks", value: detail.remarks || "-" },
    ...(detail.status === "Rejected" && detail.rejectRemarks
      ? [{ label: "Rejection remarks", value: detail.rejectRemarks }]
      : []),
  ];

  const closeTransfer = () => {
    if (reviewing) return;
    setTransferOpen(false);
  };

  return (
    <div className="border-t border-foreground/10 pt-4">
      <dl className="divide-y divide-foreground/5">
        {fields.map(({ label, value }) => (
          <div
            key={label}
            className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-6"
          >
            <dt className="text-xs text-foreground/45">{label}</dt>
            <dd className="whitespace-pre-wrap text-sm text-foreground/85">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {detail.status === "Pending" && (
        <div className="mt-2 space-y-3 border-t border-foreground/10 pt-4">
          {rejecting && (
            <div className="space-y-2">
              <label
                htmlFor={rejectId}
                className="text-xs text-foreground/45"
              >
                Rejection remarks
              </label>
              <Textarea
                id={rejectId}
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value.slice(0, 255))}
                placeholder="Explain why this budget is rejected"
                maxLength={255}
                disabled={reviewing}
                autoFocus
                className="min-h-20 rounded-lg border-foreground/10 bg-transparent"
              />
              <p className="text-xs text-foreground/35">
                {rejectRemarks.length}/255
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {rejecting ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const remarksValue = rejectRemarks.trim();
                    if (!remarksValue) {
                      toast.error(
                        "Add a short reason before rejecting this budget.",
                      );
                      return;
                    }
                    onReject(remarksValue);
                  }}
                  disabled={reviewing}
                  className="group inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  <X className="h-4 w-4 transition group-hover:scale-110" />
                  {reviewing ? "Updating…" : "Confirm reject"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setRejectRemarks("");
                  }}
                  disabled={reviewing}
                  className="rounded-full px-4 py-2.5 text-sm text-foreground/50 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={reviewing}
                  className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {reviewing ? "Updating…" : "Approve"}
                </button>
                {canTransfer && (
                  <button
                    type="button"
                    onClick={() => setTransferOpen(true)}
                    disabled={reviewing}
                    className="group inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-medium text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-200/70 text-sky-700">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </span>
                    Transfer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  disabled={reviewing}
                  className="group inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200/70 text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </span>
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {transferOpen &&
        createPortal(
          <DetailOverlay onClose={closeTransfer}>
            <TransferBudgetCard
              detail={detail}
              reviewing={reviewing}
              onClose={closeTransfer}
              onTransfer={onTransfer}
            />
          </DetailOverlay>,
          document.body,
        )}
    </div>
  );
}

function TransferBudgetCard({
  detail,
  reviewing,
  onClose,
  onTransfer,
}: {
  detail: HodBudgetDetail;
  reviewing: boolean;
  onClose: () => void;
  onTransfer: (payload: TransferBudgetInput) => void;
}) {
  const targetType = detail.budgetType === "OPEX" ? "CAPEX" : "OPEX";
  const sourceType = detail.budgetType;

  const [capexCode, setCapexCode] = useState<
    (typeof CAPEX_CODES)[number]["value"] | ""
  >("");
  const [opexCode, setOpexCode] = useState<
    (typeof OPEX_CODES)[number]["value"] | ""
  >("");
  const [itemName, setItemName] = useState(detail.activity ?? "");
  const [activity, setActivity] = useState(detail.itemName ?? "");
  const [objective, setObjective] = useState(detail.objective ?? "");
  const [justification, setJustification] = useState(detail.justification);
  const [targetMonths, setTargetMonths] = useState(detail.targetMonths ?? "");
  const [quantity, setQuantity] = useState(1);
  const [costPerUnit, setCostPerUnit] = useState(
    detail.amount > 0 ? String(detail.amount) : "",
  );
  const [budgetAmount, setBudgetAmount] = useState(
    detail.amount > 0 ? String(detail.amount) : "",
  );
  const [effectIfNotApproved, setEffectIfNotApproved] = useState("");
  const [alternative, setAlternative] = useState("");
  const [remarks, setRemarks] = useState(detail.remarks ?? "");

  const unitValue = Number(costPerUnit) || 0;
  const estimatedPrice = quantity * unitValue;
  const opexBudgetValue = Number(budgetAmount) || 0;

  const submitTransfer = () => {
    if (targetType === "CAPEX") {
      if (!capexCode) {
        toast.error("Choose a CAPEX code to continue.");
        return;
      }
      if (!itemName.trim()) {
        toast.error("Enter the item name to continue.");
        return;
      }
      if (!justification.trim()) {
        toast.error("Add a justification to continue.");
        return;
      }
      if (unitValue <= 0) {
        toast.error("Enter a cost per unit above zero.");
        return;
      }
      onTransfer({
        targetType: "CAPEX",
        code: capexCode,
        itemName: itemName.trim(),
        justification: justification.trim(),
        targetMonths: targetMonths || undefined,
        quantity,
        costPerUnit: unitValue,
        budgetAmount: estimatedPrice,
        effectIfNotApproved: effectIfNotApproved.trim() || undefined,
        alternative: alternative.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      return;
    }

    if (!opexCode) {
      toast.error("Choose an OPEX code to continue.");
      return;
    }
    if (!activity.trim()) {
      toast.error("Enter the activity to continue.");
      return;
    }
    if (!objective.trim()) {
      toast.error("Add the objectives to continue.");
      return;
    }
    if (!justification.trim()) {
      toast.error("Add a justification to continue.");
      return;
    }
    if (opexBudgetValue <= 0) {
      toast.error("Enter a budget amount above zero.");
      return;
    }
    onTransfer({
      targetType: "OPEX",
      code: opexCode,
      activity: activity.trim(),
      objective: objective.trim(),
      justification: justification.trim(),
      targetMonths: targetMonths || undefined,
      budgetAmount: opexBudgetValue,
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Transfer to {targetType}
          </p>
          <h2 className="mt-1 font-display text-3xl">YB-{detail.id}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            From {sourceType} · {formatRm(detail.amount)} · {detail.requester}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={reviewing}
          aria-label="Close transfer form"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/50 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-ivory p-4">
        <p className="text-xs text-foreground/50">
          Current {sourceType}{" "}
          {sourceType === "OPEX" ? "activity" : "item"}
        </p>
        <p className="mt-1 text-sm font-medium">
          {sourceType === "OPEX"
            ? detail.activity || "-"
            : detail.itemName || "-"}
        </p>
        <p className="mt-0.5 text-xs text-foreground/50">
          {budgetCodeLabel(detail.code, sourceType)}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {targetType === "CAPEX" ? (
          <>
            <div className="space-y-2">
              <Label>CAPEX code</Label>
              <Select
                value={capexCode}
                onValueChange={(value) =>
                  setCapexCode(value as (typeof CAPEX_CODES)[number]["value"])
                }
                disabled={reviewing}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select CAPEX code" />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {CAPEX_CODES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-item-${detail.id}`}>Item</Label>
              <Input
                id={`transfer-item-${detail.id}`}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Laboratory microscope"
                disabled={reviewing}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-justification-${detail.id}`}>
                Justification
              </Label>
              <Textarea
                id={`transfer-justification-${detail.id}`}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Why this item is needed"
                disabled={reviewing}
                className="min-h-20 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-target-${detail.id}`}>
                Target months
              </Label>
              <Input
                id={`transfer-target-${detail.id}`}
                type="month"
                value={targetMonths}
                onChange={(e) => setTargetMonths(e.target.value)}
                disabled={reviewing}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`transfer-qty-${detail.id}`}>Quantity</Label>
                <Input
                  id={`transfer-qty-${detail.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  disabled={reviewing}
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`transfer-unit-${detail.id}`}>
                  Cost per unit (RM)
                </Label>
                <Input
                  id={`transfer-unit-${detail.id}`}
                  inputMode="decimal"
                  value={costPerUnit}
                  onChange={(e) =>
                    setCostPerUnit(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  placeholder="0.00"
                  disabled={reviewing}
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-ivory px-4 py-3">
              <p className="text-xs text-foreground/50">Estimated price</p>
              <p className="mt-1 font-display text-2xl tabular-nums">
                {formatRm(estimatedPrice)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-effect-${detail.id}`}>
                Effect if not approved
              </Label>
              <Textarea
                id={`transfer-effect-${detail.id}`}
                value={effectIfNotApproved}
                onChange={(e) => setEffectIfNotApproved(e.target.value)}
                placeholder="Optional"
                disabled={reviewing}
                className="min-h-16 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-alt-${detail.id}`}>Alternative</Label>
              <Textarea
                id={`transfer-alt-${detail.id}`}
                value={alternative}
                onChange={(e) => setAlternative(e.target.value)}
                placeholder="Optional"
                disabled={reviewing}
                className="min-h-16 rounded-xl"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>OPEX code</Label>
              <Select
                value={opexCode}
                onValueChange={(value) =>
                  setOpexCode(value as (typeof OPEX_CODES)[number]["value"])
                }
                disabled={reviewing}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select OPEX code" />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {OPEX_CODES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-activity-${detail.id}`}>
                Activities / Programme / Event
              </Label>
              <Input
                id={`transfer-activity-${detail.id}`}
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="e.g. Annual maintenance"
                disabled={reviewing}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-objective-${detail.id}`}>
                Objectives
              </Label>
              <Textarea
                id={`transfer-objective-${detail.id}`}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What this budget aims to achieve"
                disabled={reviewing}
                className="min-h-20 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-justification-${detail.id}`}>
                Justification
              </Label>
              <Textarea
                id={`transfer-justification-${detail.id}`}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Why this budget is needed"
                disabled={reviewing}
                className="min-h-20 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-target-${detail.id}`}>
                Target months
              </Label>
              <Input
                id={`transfer-target-${detail.id}`}
                type="month"
                value={targetMonths}
                onChange={(e) => setTargetMonths(e.target.value)}
                disabled={reviewing}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`transfer-budget-${detail.id}`}>
                OPEX budget (RM)
              </Label>
              <Input
                id={`transfer-budget-${detail.id}`}
                inputMode="decimal"
                value={budgetAmount}
                onChange={(e) =>
                  setBudgetAmount(e.target.value.replace(/[^\d.]/g, ""))
                }
                placeholder="0.00"
                disabled={reviewing}
                className="h-11 rounded-xl tabular-nums"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor={`transfer-remarks-${detail.id}`}>Remarks</Label>
          <Input
            id={`transfer-remarks-${detail.id}`}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional"
            disabled={reviewing}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-foreground/10 pt-6">
        <button
          type="button"
          onClick={submitTransfer}
          disabled={reviewing}
          className="group inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </span>
          {reviewing ? "Transferring…" : `Confirm transfer to ${targetType}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={reviewing}
          className="rounded-full px-4 py-2.5 text-sm text-foreground/50 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function formatTargetMonth(value: string | null) {
  if (!value) return "-";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function budgetCodeLabel(code: string, budgetType: "OPEX" | "CAPEX") {
  const labels: Record<string, string> =
    budgetType === "CAPEX"
      ? {
          "200-1100": "200-1100 : Renovation",
          "200-1000": "200-1000 : Office equipment",
          "200-0500": "200-0500 : IT & audio visual",
        }
      : {
          "926-0000": "926-0000 Lease line for IT system",
          "916-0000": "916-0000 Equip. rental",
          "999-1003": "999-1003 Printing exp-meter reading",
          "992-0000": "992-0000 IT & audio visual - expenses",
          "923-0000": "923-0000 IT & audio-repair & maintenance",
        };
  return labels[code] ?? code;
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
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
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getMyQuotation,
  listMyQuotations,
  type QuotationDetail,
  type QuotationListItem,
} from "@/lib/quotation-fns";
import {
  getDepartmentBudget,
  listDepartmentBudgets,
  type BudgetDetail,
  type BudgetListItem,
} from "@/lib/budget-fns";
import {
  generatePurchaseRequisition,
  type PurchaseRequisitionFormat,
} from "@/lib/prf-generator";
import { generateRequestForQuotation } from "@/lib/rfq-generator";
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

function StatusPill({ status }: { status: Status }) {
  const { icon: Icon, tone } = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"quotations" | "budgets">("quotations");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(
    null,
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [quotationDetail, setQuotationDetail] =
    useState<QuotationDetail | null>(null);
  const [budgetDetail, setBudgetDetail] = useState<BudgetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generatingPrfId, setGeneratingPrfId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listMyQuotations(), listDepartmentBudgets()])
      .then(([quotationRows, budgetRows]) => {
        if (!active) return;
        setQuotations(quotationRows);
        setBudgets(budgetRows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load your history. Refresh and try again.",
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
    getMyQuotation({ data: { quotationId: selectedQuotationId } })
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
    getDepartmentBudget({ data: { budgetId: selectedBudgetId } })
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

  const visibleQuotations = useMemo(
    () =>
      quotations.filter(
        (req) =>
          (filter === "All" || req.status === filter) &&
          `QT-${req.id} ${req.title}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [quotations, filter, query],
  );

  const visibleBudgets = useMemo(
    () =>
      budgets.filter(
        (row) =>
          (filter === "All" || row.status === filter) &&
          `YB-${row.id} ${row.title} ${row.code} ${row.budgetType} ${row.budgetYear} ${row.createdByEmail}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      ),
    [budgets, filter, query],
  );

  const currentYear = new Date().getFullYear();
  const quotationTotal = quotations.reduce((sum, row) => sum + row.amount, 0);
  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const requestedOpex = budgets
    .filter(
      (row) => row.budgetYear === currentYear && row.budgetType === "OPEX",
    )
    .reduce((sum, row) => sum + row.amount, 0);
  const requestedCapex = budgets
    .filter(
      (row) => row.budgetYear === currentYear && row.budgetType === "CAPEX",
    )
    .reduce((sum, row) => sum + row.amount, 0);

  const generateRfq = async (id: number) => {
    const toastId = toast.loading(`Generating RFQ for QT-${id}…`);
    try {
      const result = await generateRequestForQuotation({
        data: { quotationId: id },
      });
      downloadPurchaseRequisitionFile(result);
      toast.success(`RFQ for QT-${id} downloaded.`, { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not generate RFQ for QT-${id}. Try again.`,
        { id: toastId },
      );
    }
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
          : `Could not generate PRF for QT-${id}. Try again.`,
        { id: toastId },
      );
    } finally {
      setGeneratingPrfId(null);
    }
  };

  const closeDetail = () => {
    setSelectedQuotationId(null);
    setSelectedBudgetId(null);
    setQuotationDetail(null);
    setBudgetDetail(null);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">History</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Track your quotations and department yearly budgets in one place.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-medium text-lime-foreground transition hover:brightness-95"
              >
                <Plus className="h-4 w-4" />
                New request
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => void navigate({ to: "/user/quotation" })}
              >
                Request quotation
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void navigate({ to: "/user/budget" })}
              >
                Yearly budget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Receipt}
            label="Quotations"
            value={String(quotations.length)}
            hint={formatRm(quotationTotal)}
          />
          <SummaryCard
            icon={Wallet}
            label="Budget lines"
            value={String(budgets.length)}
            hint={formatRm(budgetTotal)}
            featured
          />
          <SummaryCard
            icon={ArrowDownLeft}
            label="Requested OPEX"
            value={formatRm(requestedOpex)}
            hint={`FY ${currentYear}`}
          />
          <SummaryCard
            icon={ArrowUpRight}
            label="Requested CAPEX"
            value={formatRm(requestedCapex)}
            hint={`FY ${currentYear}`}
          />
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as "quotations" | "budgets");
              setFilter("All");
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
                  <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums">
                    {quotations.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="budgets"
                  className="rounded-full px-4 py-2 data-[state=active]:bg-background"
                >
                  Yearly budgets
                  <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums">
                    {budgets.length}
                  </span>
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

            <div className="mt-4 flex items-center gap-1 rounded-full border border-foreground/10 p-1 w-fit">
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
                <EmptyState message="Loading quotations…" />
              ) : visibleQuotations.length === 0 ? (
                <EmptyState
                  message={
                    quotations.length === 0
                      ? "No quotations yet. Submit your first request."
                      : "No quotations match your filters."
                  }
                />
              ) : (
                <ul className="divide-y divide-foreground/10">
                  {visibleQuotations.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedQuotationId(row.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:bg-ivory/60"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-ivory px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-foreground/60 uppercase">
                              Quotation
                            </span>
                            <p className="truncate text-sm font-medium">
                              {row.title}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-foreground/50">
                            QT-{row.id} · {row.itemCount} item
                            {row.itemCount === 1 ? "" : "s"} · Submitted{" "}
                            {row.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums">
                            {formatRm(row.amount)}
                          </span>
                          <StatusPill status={row.status} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="budgets" className="mt-4">
              {loading ? (
                <EmptyState message="Loading department budgets…" />
              ) : visibleBudgets.length === 0 ? (
                <EmptyState
                  message={
                    budgets.length === 0
                      ? "No department budgets yet. Submit a yearly budget request."
                      : "No budgets match your filters."
                  }
                />
              ) : (
                <ul className="divide-y divide-foreground/10">
                  {visibleBudgets.map((row) => (
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
                            YB-{row.id} · FY {row.budgetYear} · {row.code}
                            {" · "}
                            {row.isMine ? "You" : row.createdByEmail}
                            {" · "}
                            {row.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums">
                            {formatRm(row.amount)}
                          </span>
                          <StatusPill status={row.status} />
                        </div>
                      </button>
                    </li>
                  ))}
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
                Loading quotation details
              </p>
            ) : (
              <QuotationDetailCard
                detail={quotationDetail}
                onClose={closeDetail}
                onGenerateRfq={() => void generateRfq(quotationDetail.id)}
                onGeneratePrf={(format) =>
                  void generatePrf(quotationDetail.id, format)
                }
                generatingPrf={generatingPrfId === quotationDetail.id}
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
                Loading budget details
              </p>
            ) : (
              <BudgetDetailCard detail={budgetDetail} onClose={closeDetail} />
            )}
          </DetailOverlay>,
          document.body,
        )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  featured,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.5rem] p-5 shadow-card transition hover:-translate-y-0.5",
        featured ? "bg-lime text-lime-foreground" : "bg-background",
      )}
    >
      <Icon
        className={cn(
          "absolute -right-3 -bottom-3 h-20 w-20 -rotate-12 transition group-hover:rotate-0",
          featured ? "text-lime-foreground/10" : "text-foreground/5",
        )}
      />
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            featured
              ? "bg-lime-foreground/10"
              : "bg-lime text-lime-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p
          className={cn(
            "text-sm font-medium",
            featured ? "text-lime-foreground/70" : "text-foreground/60",
          )}
        >
          {label}
        </p>
      </div>
      <p className="relative mt-3 font-display text-3xl tabular-nums">{value}</p>
      <p
        className={cn(
          "relative mt-1 text-xs",
          featured ? "text-lime-foreground/60" : "text-foreground/50",
        )}
      >
        {hint}
      </p>
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

      {(detail.statusName === "approved_hod" ||
        detail.statusName === "approved_ceo" ||
        detail.statusName === "completed") && (
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
      )}
    </div>
  );
}

function BudgetDetailCard({
  detail,
  onClose,
}: {
  detail: BudgetDetail;
  onClose: () => void;
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

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
        <DetailField label="Submitted by" value={detail.createdByEmail} />
        {detail.department && (
          <DetailField label="Department" value={detail.department} />
        )}
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

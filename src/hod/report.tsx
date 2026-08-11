import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  FileDown,
  Maximize2,
  Minimize2,
  Receipt,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { exportCapexExcel, exportOpexExcel } from "@/lib/report-excel";
import { Sidebar } from "./sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  listHodBudgetReport,
  reviewHodBudget,
  transferHodBudget,
  type HodBudgetDetail,
} from "@/lib/hod-budget-fns";
import {
  listHodQuotations,
  reviewHodQuotation,
  type HodQuotationListItem,
} from "@/lib/hod-quotation-fns";

const CAPEX_CATEGORIES: Record<string, string> = {
  "200-1100": "Renovation",
  "200-1000": "Office Equipment",
  "200-0500": "IT & Audio Visual",
};

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

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

type ReportView = "opex" | "capex" | "requisitions";

function formatRm(value: number) {
  return value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonth(value: string | null) {
  if (!value) return "—";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function statusTone(status: string) {
  if (status === "Approved") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-red-100 text-red-600";
  return "bg-amber-100 text-amber-700";
}

export function HodReportPage() {
  const [view, setView] = useState<ReportView>("opex");
  const [budgetYear, setBudgetYear] = useState(String(currentYear));
  const [budgets, setBudgets] = useState<HodBudgetDetail[]>([]);
  const [requisitions, setRequisitions] = useState<HodQuotationListItem[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingRequisitions, setLoadingRequisitions] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  const [rejectBudget, setRejectBudget] = useState<HodBudgetDetail | null>(
    null,
  );
  const [transferBudgetRow, setTransferBudgetRow] =
    useState<HodBudgetDetail | null>(null);

  useEffect(() => {
    if (!maximized) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [maximized]);

  useEffect(() => {
    let active = true;
    setLoadingBudgets(true);
    listHodBudgetReport({ data: { budgetYear: Number(budgetYear) } })
      .then((rows) => {
        if (active) setBudgets(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load budget report. Try again.",
        );
      })
      .finally(() => {
        if (active) setLoadingBudgets(false);
      });
    return () => {
      active = false;
    };
  }, [budgetYear]);

  useEffect(() => {
    let active = true;
    listHodQuotations()
      .then((rows) => {
        if (active) setRequisitions(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load requisitions. Try again.",
        );
      })
      .finally(() => {
        if (active) setLoadingRequisitions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const opexRows = useMemo(
    () =>
      budgets.filter(
        (row) => row.budgetType === "OPEX" && row.status !== "Rejected",
      ),
    [budgets],
  );
  const capexRows = useMemo(
    () =>
      budgets.filter(
        (row) => row.budgetType === "CAPEX" && row.status !== "Rejected",
      ),
    [budgets],
  );

  const handleExport = async (type: "opex" | "capex") => {
    try {
      if (type === "opex") {
        await exportOpexExcel(opexRows, Number(budgetYear));
      } else {
        await exportCapexExcel(capexRows, Number(budgetYear), CAPEX_CATEGORIES);
      }
      toast.success("Excel file downloaded.");
    } catch {
      toast.error("Could not export the file. Try again.");
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
      decision === "Approved" ? `Approving YB-${id}…` : `Rejecting YB-${id}…`,
    );
    try {
      const updated = await reviewHodBudget({
        data: { budgetId: id, decision, rejectRemarks },
      });
      setBudgets((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: updated.status,
                statusName: updated.statusName,
                rejectRemarks:
                  decision === "Rejected"
                    ? rejectRemarks?.trim() || null
                    : row.rejectRemarks,
              }
            : row,
        ),
      );
      setRejectBudget(null);
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
      await transferHodBudget({
        data: { budgetId: id, ...payload },
      });
      setBudgets((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          if (payload.targetType === "CAPEX") {
            return {
              ...row,
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
            ...row,
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
        }),
      );
      setTransferBudgetRow(null);
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

  const opexTotal = opexRows.reduce((sum, row) => sum + row.amount, 0);
  const capexTotal = capexRows.reduce((sum, row) => sum + row.amount, 0);
  const requisitionTotal = requisitions.reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Reports</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Department OPEX, CAPEX, and quotation requisitions in one view.
            </p>
          </div>
          <div className="w-40">
            <Select value={budgetYear} onValueChange={setBudgetYear}>
              <SelectTrigger className="h-11 rounded-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    FY {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryStat
            label={`OPEX FY ${budgetYear}`}
            value={`RM ${formatRm(opexTotal)}`}
            hint={`${opexRows.length} line${opexRows.length === 1 ? "" : "s"}`}
            icon={ArrowDownLeft}
            active={view === "opex"}
            onClick={() => setView("opex")}
          />
          <SummaryStat
            label={`CAPEX FY ${budgetYear}`}
            value={`RM ${formatRm(capexTotal)}`}
            hint={`${capexRows.length} line${capexRows.length === 1 ? "" : "s"}`}
            icon={ArrowUpRight}
            active={view === "capex"}
            onClick={() => setView("capex")}
          />
          <SummaryStat
            label="Requisitions"
            value={`RM ${formatRm(requisitionTotal)}`}
            hint={`${requisitions.length} request${requisitions.length === 1 ? "" : "s"}`}
            icon={Receipt}
            active={view === "requisitions"}
            onClick={() => setView("requisitions")}
          />
        </div>

        <div
          className={cn(
            "mt-6 rounded-[1.5rem] bg-background p-6 shadow-card md:p-8",
            maximized &&
              "fixed inset-0 z-50 mt-0 flex h-screen w-screen flex-col overflow-hidden rounded-none p-6 md:p-8",
          )}
        >
          {view === "opex" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <ReportSectionTitle>
                  Operating Expenditure {budgetYear} (OPEX)
                </ReportSectionTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <MaximizeButton
                    maximized={maximized}
                    onClick={() => setMaximized((value) => !value)}
                  />
                  <ExportButton
                    disabled={loadingBudgets || opexRows.length === 0}
                    onClick={() => handleExport("opex")}
                  />
                </div>
              </div>
              <div
                className={cn(
                  maximized && "min-h-0 flex-1 overflow-auto",
                )}
              >
                {loadingBudgets ? (
                  <LoadingState message="Loading OPEX report…" />
                ) : opexRows.length === 0 ? (
                  <EmptyState
                    message="No OPEX lines for this year yet."
                    maximized={maximized}
                  />
                ) : (
                  <OpexTable
                    rows={opexRows}
                    total={opexTotal}
                    reviewingKey={reviewingKey}
                    onApprove={(id) => void reviewBudget(id, "Approved")}
                    onReject={setRejectBudget}
                    onTransfer={setTransferBudgetRow}
                  />
                )}
              </div>
            </>
          )}

          {view === "capex" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <ReportSectionTitle>
                  Capital Expenditure {budgetYear} (CAPEX)
                </ReportSectionTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <MaximizeButton
                    maximized={maximized}
                    onClick={() => setMaximized((value) => !value)}
                  />
                  <ExportButton
                    disabled={loadingBudgets || capexRows.length === 0}
                    onClick={() => handleExport("capex")}
                  />
                </div>
              </div>
              <div
                className={cn(
                  maximized && "min-h-0 flex-1 overflow-auto",
                )}
              >
                {loadingBudgets ? (
                  <LoadingState message="Loading CAPEX report…" />
                ) : capexRows.length === 0 ? (
                  <EmptyState
                    message="No CAPEX lines for this year yet."
                    maximized={maximized}
                  />
                ) : (
                  <CapexTable
                    rows={capexRows}
                    year={Number(budgetYear)}
                    total={capexTotal}
                    reviewingKey={reviewingKey}
                    onApprove={(id) => void reviewBudget(id, "Approved")}
                    onReject={setRejectBudget}
                    onTransfer={setTransferBudgetRow}
                  />
                )}
              </div>
            </>
          )}

          {view === "requisitions" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <ReportSectionTitle>Quotation Requisitions</ReportSectionTitle>
                <MaximizeButton
                  maximized={maximized}
                  onClick={() => setMaximized((value) => !value)}
                />
              </div>
              <div
                className={cn(
                  maximized && "min-h-0 flex-1 overflow-auto",
                )}
              >
                {loadingRequisitions ? (
                  <LoadingState message="Loading requisitions…" />
                ) : requisitions.length === 0 ? (
                  <EmptyState
                    message="No requisitions submitted yet."
                    maximized={maximized}
                  />
                ) : (
                  <RequisitionTable
                    rows={requisitions}
                    total={requisitionTotal}
                    reviewingKey={reviewingKey}
                    onApprove={(id) => void reviewQuotation(id, "Approved")}
                    onReject={(id) => void reviewQuotation(id, "Rejected")}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {rejectBudget &&
        createPortal(
          <DetailOverlay
            onClose={() => {
              if (reviewingKey != null) return;
              setRejectBudget(null);
            }}
          >
            <RejectBudgetCard
              detail={rejectBudget}
              reviewing={reviewingKey === `yb-${rejectBudget.id}`}
              onClose={() => setRejectBudget(null)}
              onReject={(remarks) =>
                void reviewBudget(rejectBudget.id, "Rejected", remarks)
              }
            />
          </DetailOverlay>,
          document.body,
        )}

      {transferBudgetRow &&
        createPortal(
          <DetailOverlay
            onClose={() => {
              if (reviewingKey != null) return;
              setTransferBudgetRow(null);
            }}
          >
            <TransferBudgetCard
              detail={transferBudgetRow}
              reviewing={reviewingKey === `yb-${transferBudgetRow.id}`}
              onClose={() => setTransferBudgetRow(null)}
              onTransfer={(payload) =>
                void transferBudget(transferBudgetRow.id, payload)
              }
            />
          </DetailOverlay>,
          document.body,
        )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[1.5rem] p-6 text-left shadow-card transition hover:-translate-y-0.5",
        active ? "bg-lime text-lime-foreground" : "bg-background",
      )}
    >
      <Icon
        className={cn(
          "absolute -right-4 -bottom-4 h-24 w-24 -rotate-12 transition group-hover:rotate-0",
          active ? "text-lime-foreground/10" : "text-foreground/5",
        )}
      />

      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            active
              ? "bg-lime-foreground/10"
              : "bg-lime text-lime-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p
          className={cn(
            "text-sm font-medium",
            active ? "text-lime-foreground/70" : "text-foreground/60",
          )}
        >
          {label}
        </p>
      </div>

      <p className="relative mt-4 font-display text-4xl tabular-nums">{value}</p>
      <p
        className={cn(
          "relative mt-1.5 text-xs",
          active ? "text-lime-foreground/60" : "text-foreground/50",
        )}
      >
        {hint}
      </p>
    </button>
  );
}

function ExportButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-medium text-lime-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      Export to Excel
    </button>
  );
}

function MaximizeButton({
  maximized,
  onClick,
}: {
  maximized: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={maximized ? "Exit fullscreen" : "Maximize screen"}
      title={maximized ? "Exit fullscreen" : "Maximize screen"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
    >
      {maximized ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </button>
  );
}

function ReportSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-lg tracking-normal text-foreground">
      {children}
    </h2>
  );
}

function LoadingState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-foreground/50">{message}</p>;
}

function EmptyState({
  message,
  maximized,
}: {
  message: string;
  maximized?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-foreground/15 text-center",
        maximized
          ? "flex h-full min-h-[calc(100vh-8rem)] items-center justify-center py-14"
          : "py-14",
      )}
    >
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

function BudgetActions({
  row,
  reviewing,
  onApprove,
  onReject,
  onTransfer,
}: {
  row: HodBudgetDetail;
  reviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onTransfer: () => void;
}) {
  if (row.status !== "Pending") {
    return <span className="text-xs text-foreground/40">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={onApprove}
        disabled={reviewing}
        aria-label="Approve"
        title="Approve"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:brightness-95 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={reviewing}
        aria-label="Reject"
        title="Reject"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:brightness-95 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onTransfer}
        disabled={reviewing}
        aria-label="Transfer"
        title="Transfer"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-800 transition hover:brightness-95 disabled:opacity-50"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function QuotationActions({
  status,
  reviewing,
  onApprove,
  onReject,
}: {
  status: HodQuotationListItem["status"];
  reviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (status !== "Pending") {
    return <span className="text-xs text-foreground/40">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={onApprove}
        disabled={reviewing}
        aria-label="Approve"
        title="Approve"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:brightness-95 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={reviewing}
        aria-label="Reject"
        title="Reject"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:brightness-95 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RejectBudgetCard({
  detail,
  reviewing,
  onClose,
  onReject,
}: {
  detail: HodBudgetDetail;
  reviewing: boolean;
  onClose: () => void;
  onReject: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const rejectId = `report-reject-${detail.id}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Reject budget
          </p>
          <h2 className="mt-1 font-display text-3xl">YB-{detail.id}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {detail.budgetType === "CAPEX"
              ? detail.itemName || "Capital expenditure"
              : detail.activity || "Operating expenditure"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={reviewing}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 space-y-2">
        <Label htmlFor={rejectId}>Rejection remarks</Label>
        <Textarea
          id={rejectId}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value.slice(0, 255))}
          placeholder="Explain why this budget is rejected"
          maxLength={255}
          disabled={reviewing}
          autoFocus
          className="min-h-24 rounded-xl"
        />
        <p className="text-xs text-foreground/35">{remarks.length}/255</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-foreground/10 pt-6">
        <button
          type="button"
          onClick={() => {
            const value = remarks.trim();
            if (!value) {
              toast.error("Add a short reason before rejecting this budget.");
              return;
            }
            onReject(value);
          }}
          disabled={reviewing}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          {reviewing ? "Updating…" : "Confirm reject"}
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
            From {sourceType} · RM {formatRm(detail.amount)} · {detail.requester}
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
                RM {formatRm(estimatedPrice)}
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
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          <ArrowRightLeft className="h-4 w-4" />
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

function OpexTable({
  rows,
  total,
  reviewingKey,
  onApprove,
  onReject,
  onTransfer,
}: {
  rows: HodBudgetDetail[];
  total: number;
  reviewingKey: string | null;
  onApprove: (id: number) => void;
  onReject: (row: HodBudgetDetail) => void;
  onTransfer: (row: HodBudgetDetail) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/15">
      <table className="min-w-[1300px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#ebe6dc] text-center text-xs font-semibold uppercase tracking-wide text-foreground">
            <th className="border border-foreground/20 px-3 py-3">No.</th>
            <th className="border border-foreground/20 px-3 py-3">
              Code (AutoCount)
            </th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Activities / Programme / Event
            </th>
            <th className="border border-foreground/20 px-3 py-3">
              Target month/s to spend
            </th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Objectives
            </th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Justifications (calculation)
            </th>
            <th className="border border-foreground/20 px-3 py-3">
              OPEX budget (RM)
            </th>
            <th className="border border-foreground/20 px-3 py-3">Status</th>
            <th className="border border-foreground/20 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="align-top odd:bg-background even:bg-ivory/40">
              <td className="border border-foreground/15 px-3 py-3 text-center tabular-nums">
                {index + 1}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center font-medium tabular-nums">
                {row.code}
              </td>
              <td className="border border-foreground/15 px-3 py-3">
                {row.activity || "—"}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                {formatMonth(row.targetMonths)}
              </td>
              <td className="border border-foreground/15 px-3 py-3 whitespace-pre-wrap">
                {row.objective || "—"}
              </td>
              <td className="border border-foreground/15 px-3 py-3 whitespace-pre-wrap">
                {row.justification}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-right font-medium tabular-nums">
                {formatRm(row.amount)}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    statusTone(row.status),
                  )}
                >
                  {row.status}
                </span>
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <BudgetActions
                  row={row}
                  reviewing={reviewingKey === `yb-${row.id}`}
                  onApprove={() => onApprove(row.id)}
                  onReject={() => onReject(row)}
                  onTransfer={() => onTransfer(row)}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#ebe6dc] font-medium">
            <td
              colSpan={6}
              className="border border-foreground/15 px-3 py-3 text-right"
            >
              Total OPEX
            </td>
            <td className="border border-foreground/15 px-3 py-3 text-right tabular-nums">
              {formatRm(total)}
            </td>
            <td
              colSpan={2}
              className="border border-foreground/15 px-3 py-3"
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CapexTable({
  rows,
  year,
  total,
  reviewingKey,
  onApprove,
  onReject,
  onTransfer,
}: {
  rows: HodBudgetDetail[];
  year: number;
  total: number;
  reviewingKey: string | null;
  onApprove: (id: number) => void;
  onReject: (row: HodBudgetDetail) => void;
  onTransfer: (row: HodBudgetDetail) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/15">
      <table className="min-w-[1600px] w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              colSpan={5}
              className="border border-foreground/20 bg-[#ebe6dc] px-3 py-2 text-xs font-semibold uppercase tracking-wide"
            >
              Item details
            </th>
            <th
              colSpan={3}
              className="border border-foreground/20 bg-amber-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide"
            >
              Budget {year}
            </th>
            <th
              colSpan={4}
              className="border border-foreground/20 bg-stone-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide"
            >
              Impact & alternatives
            </th>
          </tr>
          <tr className="bg-[#ebe6dc] text-center text-xs font-semibold uppercase tracking-wide">
            <th className="border border-foreground/20 px-3 py-3">No.</th>
            <th className="border border-foreground/20 px-3 py-3">Category</th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Item
            </th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Justification
            </th>
            <th className="border border-foreground/20 px-3 py-3">
              Target month/s to spend
            </th>
            <th className="border border-foreground/20 bg-amber-50 px-3 py-3">
              Quantity
            </th>
            <th className="border border-foreground/20 bg-amber-50 px-3 py-3">
              Estimated cost p/unit
            </th>
            <th className="border border-foreground/20 bg-amber-50 px-3 py-3">
              Estimated price
            </th>
            <th className="border border-foreground/20 bg-stone-100 px-3 py-3 text-left">
              Effect if budget not approved
            </th>
            <th className="border border-foreground/20 bg-stone-100 px-3 py-3 text-left">
              Alternative more cost-effective
            </th>
            <th className="border border-foreground/20 px-3 py-3">Status</th>
            <th className="border border-foreground/20 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="align-top odd:bg-background even:bg-ivory/40">
              <td className="border border-foreground/15 px-3 py-3 text-center tabular-nums">
                {index + 1}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                {CAPEX_CATEGORIES[row.code] || row.code}
              </td>
              <td className="border border-foreground/15 px-3 py-3 font-medium">
                {row.itemName || "—"}
                <p className="mt-1 text-xs font-normal text-foreground/50">
                  {row.code}
                </p>
              </td>
              <td className="border border-foreground/15 px-3 py-3 whitespace-pre-wrap">
                {row.justification}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                {formatMonth(row.targetMonths)}
              </td>
              <td className="border border-foreground/15 bg-amber-50/60 px-3 py-3 text-center tabular-nums">
                {row.quantity ?? "—"}
              </td>
              <td className="border border-foreground/15 bg-amber-50/60 px-3 py-3 text-right tabular-nums">
                {row.costPerUnit == null ? "—" : formatRm(row.costPerUnit)}
              </td>
              <td className="border border-foreground/15 bg-amber-50/60 px-3 py-3 text-right font-medium tabular-nums">
                {formatRm(row.amount)}
              </td>
              <td className="border border-foreground/15 bg-stone-50 px-3 py-3 whitespace-pre-wrap">
                {row.effectIfNotApproved || "—"}
              </td>
              <td className="border border-foreground/15 bg-stone-50 px-3 py-3 whitespace-pre-wrap">
                {row.alternative || "—"}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    statusTone(row.status),
                  )}
                >
                  {row.status}
                </span>
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <BudgetActions
                  row={row}
                  reviewing={reviewingKey === `yb-${row.id}`}
                  onApprove={() => onApprove(row.id)}
                  onReject={() => onReject(row)}
                  onTransfer={() => onTransfer(row)}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-amber-50 font-medium">
            <td
              colSpan={7}
              className="border border-foreground/15 px-3 py-3 text-right"
            >
              Total CAPEX
            </td>
            <td className="border border-foreground/15 px-3 py-3 text-right tabular-nums">
              {formatRm(total)}
            </td>
            <td
              colSpan={4}
              className="border border-foreground/15 px-3 py-3"
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RequisitionTable({
  rows,
  total,
  reviewingKey,
  onApprove,
  onReject,
}: {
  rows: HodQuotationListItem[];
  total: number;
  reviewingKey: string | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/15">
      <table className="min-w-[1100px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#ebe6dc] text-center text-xs font-semibold uppercase tracking-wide">
            <th className="border border-foreground/20 px-3 py-3">No.</th>
            <th className="border border-foreground/20 px-3 py-3">Ref</th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Item / request
            </th>
            <th className="border border-foreground/20 px-3 py-3 text-left">
              Requester
            </th>
            <th className="border border-foreground/20 px-3 py-3">
              Submitted
            </th>
            <th className="border border-foreground/20 px-3 py-3">
              Amount (RM)
            </th>
            <th className="border border-foreground/20 px-3 py-3">Status</th>
            <th className="border border-foreground/20 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="align-top odd:bg-background even:bg-ivory/40">
              <td className="border border-foreground/15 px-3 py-3 text-center tabular-nums">
                {index + 1}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center font-medium">
                QT-{row.id}
              </td>
              <td className="border border-foreground/15 px-3 py-3">
                {row.title}
              </td>
              <td className="border border-foreground/15 px-3 py-3">
                {row.requester}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                {row.date}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-right font-medium tabular-nums">
                {formatRm(row.amount)}
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    statusTone(row.status),
                  )}
                >
                  {row.status}
                </span>
              </td>
              <td className="border border-foreground/15 px-3 py-3 text-center">
                <QuotationActions
                  status={row.status}
                  reviewing={reviewingKey === `qt-${row.id}`}
                  onApprove={() => onApprove(row.id)}
                  onReject={() => onReject(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#ebe6dc] font-medium">
            <td
              colSpan={5}
              className="border border-foreground/15 px-3 py-3 text-right"
            >
              Total requisitions
            </td>
            <td className="border border-foreground/15 px-3 py-3 text-right tabular-nums">
              {formatRm(total)}
            </td>
            <td
              colSpan={2}
              className="border border-foreground/15 px-3 py-3"
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

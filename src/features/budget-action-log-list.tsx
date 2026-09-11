import { useRef, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BudgetActionLog } from "@backend/server-functions/budget-log-fns";
import type { BudgetSnapshot } from "@backend/core/budget-action-log";

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const actionLabel: Record<BudgetActionLog["action"], string> = {
  edit: "Edited details",
  transfer: "Transferred",
  delete: "Deleted",
  update_budget: "Updated budget",
};

const actionTone: Record<BudgetActionLog["action"], string> = {
  edit: "bg-sky-100 text-sky-800",
  transfer: "bg-amber-100 text-amber-800",
  delete: "bg-rose-100 text-rose-800",
  update_budget: "bg-emerald-100 text-emerald-800",
};

const fieldLabel: Record<keyof BudgetSnapshot, string> = {
  budgetType: "Type",
  code: "Code",
  activity: "Activity",
  itemName: "Item",
  targetMonths: "Target months",
  objective: "Objectives",
  justification: "Justification",
  quantity: "Quantity",
  costPerUnit: "Cost per unit",
  amount: "Amount",
  effectIfNotApproved: "Effect if not approved",
  alternative: "Alternative",
  remarks: "Form remarks",
  status: "Status",
};

function formatValue(key: keyof BudgetSnapshot, value: unknown) {
  if (value == null || value === "") return "—";
  if (key === "amount" || key === "costPerUnit") return formatRm(Number(value));
  return String(value);
}

function changedFields(oldValues: BudgetSnapshot, newValues: BudgetSnapshot | null) {
  if (!newValues) {
    return (Object.keys(oldValues) as (keyof BudgetSnapshot)[])
      .filter((key) => oldValues[key] != null && oldValues[key] !== "")
      .map((key) => ({
        key,
        from: formatValue(key, oldValues[key]),
        to: "Removed",
      }));
  }

  return (Object.keys(oldValues) as (keyof BudgetSnapshot)[])
    .filter((key) => String(oldValues[key] ?? "") !== String(newValues[key] ?? ""))
    .map((key) => ({
      key,
      from: formatValue(key, oldValues[key]),
      to: formatValue(key, newValues[key]),
    }));
}

export function BudgetLogList({
  logs,
  loading,
  emptyMessage,
}: {
  logs: BudgetActionLog[];
  loading: boolean;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 py-14 text-center">
        <p className="text-sm text-foreground/50">Loading logs…</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 py-14 text-center">
        <p className="text-sm text-foreground/50">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-foreground/10">
      {logs.map((row) => {
        const changes = changedFields(row.oldValues, row.newValues);
        const changeText = changes
          .map((change) => `${fieldLabel[change.key]} ${change.from}→${change.to}`)
          .join(" · ");
        const beforeDate = [
          row.budgetType,
          `FY ${row.budgetYear}`,
          row.actorEmail,
          row.actorEmail !== row.ownerEmail ? row.ownerEmail : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const afterDate = [row.remarks, changeText].filter(Boolean).join(" · ");

        return (
          <li key={row.id} className="flex items-center gap-3 py-3">
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${actionTone[row.action]}`}
            >
              {actionLabel[row.action]}
            </span>
            <p
              className="min-w-0 truncate text-sm"
              title={`${row.budgetRef} · ${beforeDate} · ${row.date}${afterDate ? ` · ${afterDate}` : ""}`}
            >
              <span className="font-medium">{row.budgetRef}</span>
              <span className="text-foreground/50"> · {beforeDate} · </span>
              <span className="font-medium">{row.date}</span>
              {afterDate ? (
                <span className="text-foreground/50"> · {afterDate}</span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export type UpdateApprovedBudgetPayload =
  | {
      budgetType: "OPEX";
      items: Array<{
        itemName: string;
        quantity: number;
        costPerUnit: number;
        budgetAmount: number;
      }>;
      remarks: string;
    }
  | {
      budgetType: "CAPEX";
      quantity: number;
      costPerUnit: number;
      budgetAmount: number;
      remarks: string;
    };

type EditableItem = {
  id: number;
  itemName: string;
  quantity: number;
  costPerUnit: string;
};

function lineAmount(item: EditableItem) {
  return (Number(item.costPerUnit) || 0) * item.quantity;
}

export function UpdateApprovedBudgetForm({
  budgetId,
  budgetRef,
  budgetType,
  amount,
  quantity,
  costPerUnit,
  items = [],
  saving,
  onClose,
  onSave,
}: {
  budgetId: number;
  budgetRef?: string;
  budgetType: "OPEX" | "CAPEX";
  amount: number;
  quantity: number | null;
  costPerUnit: number | null;
  items?: Array<{
    id?: number;
    itemName?: string | null;
    quantity: number;
    costPerUnit: number;
    amount: number;
  }>;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: UpdateApprovedBudgetPayload) => void;
}) {
  const isCapex = budgetType === "CAPEX";
  const nextItemId = useRef(
    Math.max(0, ...items.map((item) => item.id ?? 0)) + 1,
  );
  const [qty, setQty] = useState(quantity ?? 1);
  const [unit, setUnit] = useState(costPerUnit == null ? "" : String(costPerUnit));
  const [budgetAmount, setBudgetAmount] = useState(String(amount));
  const [opexItems, setOpexItems] = useState<EditableItem[]>(() =>
    items.length > 0
      ? items.map((item) => ({
          id: item.id ?? nextItemId.current++,
          itemName: item.itemName ?? "",
          quantity: item.quantity,
          costPerUnit: String(item.costPerUnit),
        }))
      : [
          {
            id: nextItemId.current++,
            itemName: "",
            quantity: 1,
            costPerUnit: String(amount || ""),
          },
        ],
  );
  const [remarks, setRemarks] = useState("");

  const unitValue = Number(unit) || 0;
  const amountValue = Number(budgetAmount) || 0;
  const opexTotal = opexItems.reduce((sum, item) => sum + lineAmount(item), 0);
  const readyOpexItems = opexItems.filter(
    (item) =>
      item.itemName.trim() && item.quantity > 0 && (Number(item.costPerUnit) || 0) > 0,
  );

  const updateItem = (id: number, patch: Partial<EditableItem>) => {
    setOpexItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const submit = () => {
    if (!remarks.trim()) {
      toast.error("Say why the amount changed, then try again.");
      return;
    }
    if (isCapex) {
      if (amountValue <= 0) {
        toast.error("Enter an amount above zero, then try again.");
        return;
      }
      if (qty < 1 || unitValue <= 0) {
        toast.error("Enter quantity and unit cost, then try again.");
        return;
      }
      onSave({
        budgetType: "CAPEX",
        quantity: qty,
        costPerUnit: unitValue,
        budgetAmount: amountValue,
        remarks: remarks.trim(),
      });
      return;
    }
    if (readyOpexItems.length === 0) {
      toast.error("Add at least one item with name, quantity, and unit cost.");
      return;
    }
    onSave({
      budgetType: "OPEX",
      items: readyOpexItems.map((item) => ({
        itemName: item.itemName.trim(),
        quantity: item.quantity,
        costPerUnit: Number(item.costPerUnit),
        budgetAmount: lineAmount(item),
      })),
      remarks: remarks.trim(),
    });
  };

  const remarksMissing = remarks.trim().length === 0;
  const opexInvalid = !isCapex && readyOpexItems.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
            Update budget
          </p>
          <h2 className="mt-1 font-display text-3xl">
            {budgetRef || "this budget"}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Current total {formatRm(amount)}. Other details stay the same.
            Status does not change.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close update budget"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/50 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isCapex ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="update-qty">Quantity</Label>
                <Input
                  id="update-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  disabled={saving}
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="update-unit">Cost per unit (RM)</Label>
                <Input
                  id="update-unit"
                  inputMode="decimal"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value.replace(/[^\d.]/g, ""))}
                  disabled={saving}
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="update-price">Estimated price (RM)</Label>
              <Input
                id="update-price"
                inputMode="decimal"
                value={budgetAmount}
                onChange={(e) =>
                  setBudgetAmount(e.target.value.replace(/[^\d.]/g, ""))
                }
                disabled={saving}
                className="h-11 rounded-xl tabular-nums"
              />
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/10">
            <div className="hidden grid-cols-[minmax(0,1fr)_108px_120px_88px_36px] gap-2 border-b border-foreground/10 bg-ivory/60 px-3 py-2 text-xs font-medium tracking-wide text-foreground/50 uppercase sm:grid">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span>Unit cost</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <div className="divide-y divide-foreground/8">
              {opexItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_108px_120px_88px_36px] sm:items-center"
                >
                  <Input
                    value={item.itemName}
                    onChange={(e) =>
                      updateItem(item.id, { itemName: e.target.value })
                    }
                    placeholder={`Item ${index + 1}`}
                    disabled={saving}
                    className="h-10 rounded-lg"
                  />
                  <div className="flex items-center justify-center gap-0.5 rounded-full border border-foreground/10 p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(item.id, {
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      disabled={saving}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-ivory disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(item.id, { quantity: item.quantity + 1 })
                      }
                      disabled={saving}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-ivory disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    inputMode="decimal"
                    value={item.costPerUnit}
                    onChange={(e) =>
                      updateItem(item.id, {
                        costPerUnit: e.target.value.replace(/[^\d.]/g, ""),
                      })
                    }
                    disabled={saving}
                    className="h-10 rounded-lg tabular-nums"
                  />
                  <span className="text-right text-sm font-semibold tabular-nums">
                    {formatRm(lineAmount(item))}
                  </span>
                  <div className="flex justify-end">
                    {opexItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpexItems((prev) =>
                            prev.filter((entry) => entry.id !== item.id),
                          )
                        }
                        disabled={saving}
                        aria-label="Remove item"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-foreground/10 bg-ivory/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  setOpexItems((prev) => [
                    ...prev,
                    {
                      id: nextItemId.current++,
                      itemName: "",
                      quantity: 1,
                      costPerUnit: "",
                    },
                  ])
                }
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 transition hover:text-foreground disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another item
              </button>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <span className="text-sm text-foreground/55">OPEX total</span>
                <span className="font-display text-lg tabular-nums">
                  {formatRm(opexTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="update-remarks">Remarks</Label>
          <Textarea
            id="update-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Why this amount is changing"
            disabled={saving}
            className="min-h-20 rounded-xl"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-foreground/10 pt-6">
        <button
          type="button"
          onClick={submit}
          disabled={
            saving ||
            remarksMissing ||
            (isCapex ? amountValue <= 0 : opexInvalid)
          }
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Updating…" : "Update budget"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-foreground/60 transition hover:bg-ivory hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function filterBudgetLogs(logs: BudgetActionLog[], query: string) {
  const needle = query.toLowerCase().trim();
  if (!needle) return logs;
  return logs.filter((row) =>
    `${row.budgetRef} ${row.actorEmail} ${row.ownerEmail} ${row.action} ${row.remarks ?? ""} ${row.budgetType}`
      .toLowerCase()
      .includes(needle),
  );
}

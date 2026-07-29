import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ClipboardList,
  Send,
} from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { submitYearlyBudget } from "@/lib/budget-fns";

const OPEX_CODES = [
  {
    value: "926-0000",
    label: "926-0000 LEASE LINE FOR IT SYSTEM (926-000/23121)",
  },
  {
    value: "916-0000",
    label: "916-0000 EQUIP. RENTAL (916-000/24501) - Photocopy machine include SST 8%",
  },
  {
    value: "999-1003",
    label: "999-1003 PRINTING EXP-METER READING (999-1003/27101)",
  },
  {
    value: "992-0000",
    label: "992-0000 IT & AUDIO VISUAL - EXPENSES (992-000/27809)",
  },
  {
    value: "923-0000",
    label: "923-0000 IT & AUDIO-REPAIR & MAINTENANCE (923-000/28503)",
  },
] as const;

const CAPEX_CODES = [
  { value: "200-1100", label: "200-1100 : RENOVATION" },
  { value: "200-1000", label: "200-1000 : OFFICE EQUIPMENT" },
  { value: "200-0500", label: "200-0500 : IT & AUDIO VISUAL" },
] as const;

type OpexItem = {
  id: number;
  code: string;
  activity: string;
  targetMonths: string;
  objectives: string;
  justifications: string;
  budget: number;
  remarks: string;
};

type CapexItem = {
  id: number;
  code: string;
  item: string;
  justification: string;
  targetMonths: string;
  quantity: number;
  costPerUnit: number;
  estimatedPrice: number;
  effectIfNotApproved: string;
  alternative: string;
  remarks: string;
};

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function opexCodeLabel(code: string) {
  return OPEX_CODES.find((entry) => entry.value === code)?.label ?? code;
}

function capexCodeLabel(code: string) {
  return CAPEX_CODES.find((entry) => entry.value === code)?.label ?? code;
}

export function BudgetFormPage() {
  const navigate = useNavigate();
  const [opexItems, setOpexItems] = useState<OpexItem[]>([]);
  const [capexItems, setCapexItems] = useState<CapexItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [opexCode, setOpexCode] = useState("");
  const [opexActivity, setOpexActivity] = useState("");
  const [opexTargetMonths, setOpexTargetMonths] = useState("");
  const [opexObjectives, setOpexObjectives] = useState("");
  const [opexJustifications, setOpexJustifications] = useState("");
  const [opexBudget, setOpexBudget] = useState("");
  const [opexRemarks, setOpexRemarks] = useState("");

  const [capexCode, setCapexCode] = useState("");
  const [capexItem, setCapexItem] = useState("");
  const [capexJustification, setCapexJustification] = useState("");
  const [capexTargetMonths, setCapexTargetMonths] = useState("");
  const [capexQuantity, setCapexQuantity] = useState(1);
  const [capexCostPerUnit, setCapexCostPerUnit] = useState("");
  const [capexEffect, setCapexEffect] = useState("");
  const [capexAlternative, setCapexAlternative] = useState("");
  const [capexRemarks, setCapexRemarks] = useState("");

  const capexUnit = Number(capexCostPerUnit) || 0;
  const capexEstimated = capexUnit * capexQuantity;
  const opexBudgetValue = Number(opexBudget) || 0;
  const opexTotal = opexItems.reduce((sum, item) => sum + item.budget, 0);
  const capexTotal = capexItems.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const grandTotal = opexTotal + capexTotal;
  const canAddOpex =
    opexCode &&
    opexActivity.trim() &&
    opexBudgetValue > 0 &&
    opexObjectives.trim() &&
    opexJustifications.trim();
  const canAddCapex =
    capexCode && capexItem.trim() && capexUnit > 0 && capexJustification.trim();

  const resetOpexForm = () => {
    setOpexCode("");
    setOpexActivity("");
    setOpexTargetMonths("");
    setOpexObjectives("");
    setOpexJustifications("");
    setOpexBudget("");
    setOpexRemarks("");
  };

  const resetCapexForm = () => {
    setCapexCode("");
    setCapexItem("");
    setCapexJustification("");
    setCapexTargetMonths("");
    setCapexQuantity(1);
    setCapexCostPerUnit("");
    setCapexEffect("");
    setCapexAlternative("");
    setCapexRemarks("");
  };

  const addOpex = (e: FormEvent) => {
    e.preventDefault();
    if (!canAddOpex) return;
    setOpexItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        code: opexCode,
        activity: opexActivity.trim(),
        targetMonths: opexTargetMonths.trim(),
        objectives: opexObjectives.trim(),
        justifications: opexJustifications.trim(),
        budget: opexBudgetValue,
        remarks: opexRemarks.trim(),
      },
    ]);
    resetOpexForm();
  };

  const addCapex = (e: FormEvent) => {
    e.preventDefault();
    if (!canAddCapex) return;
    setCapexItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        code: capexCode,
        item: capexItem.trim(),
        justification: capexJustification.trim(),
        targetMonths: capexTargetMonths.trim(),
        quantity: capexQuantity,
        costPerUnit: capexUnit,
        estimatedPrice: capexEstimated,
        effectIfNotApproved: capexEffect.trim(),
        alternative: capexAlternative.trim(),
        remarks: capexRemarks.trim(),
      },
    ]);
    resetCapexForm();
  };

  const removeOpex = (id: number) => {
    setOpexItems((prev) => prev.filter((item) => item.id !== id));
  };

  const removeCapex = (id: number) => {
    setCapexItems((prev) => prev.filter((item) => item.id !== id));
  };

  const submit = async () => {
    if (opexItems.length === 0 && capexItems.length === 0) {
      toast.error("Add at least one OPEX or CAPEX line before submitting.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitYearlyBudget({
        data: {
          budgetYear: new Date().getFullYear(),
          opex: opexItems.map((item) => ({
            code: item.code,
            activity: item.activity,
            targetMonths: item.targetMonths || undefined,
            objective: item.objectives,
            justification: item.justifications,
            budgetAmount: item.budget,
            remarks: item.remarks || undefined,
          })),
          capex: capexItems.map((item) => ({
            code: item.code,
            itemName: item.item,
            justification: item.justification,
            targetMonths: item.targetMonths || undefined,
            quantity: item.quantity,
            costPerUnit: item.costPerUnit,
            budgetAmount: item.estimatedPrice,
            effectIfNotApproved: item.effectIfNotApproved || undefined,
            alternative: item.alternative || undefined,
            remarks: item.remarks || undefined,
          })),
        },
      });

      toast.success("Yearly budget request saved", {
        description: `${result.count} line${result.count === 1 ? "" : "s"} for ${result.budgetYear} · ${formatRm(grandTotal)} total.`,
      });
      navigate({ to: "/user" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your budget. Try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <Link
          to="/user"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6">
          <h1 className="font-display text-4xl">Yearly budget request</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Add OPEX and CAPEX lines for the upcoming financial year, then submit
            for review.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            <Tabs defaultValue="opex">
              <TabsList className="h-auto w-full rounded-full border border-foreground/10 bg-ivory p-1">
                <TabsTrigger
                  value="opex"
                  className="flex-1 rounded-full px-4 py-2 data-[state=active]:bg-background"
                >
                  OPEX
                </TabsTrigger>
                <TabsTrigger
                  value="capex"
                  className="flex-1 rounded-full px-4 py-2 data-[state=active]:bg-background"
                >
                  CAPEX
                </TabsTrigger>
              </TabsList>

              <TabsContent value="opex" className="mt-6">
                <form onSubmit={addOpex} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Code (OPEX)</Label>
                    <Select value={opexCode} onValueChange={setOpexCode}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select OPEX code" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPEX_CODES.map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opex-activity">Activities / Programme / Event</Label>
                    <Input
                      id="opex-activity"
                      value={opexActivity}
                      onChange={(e) => setOpexActivity(e.target.value)}
                      placeholder="e.g. Annual IT maintenance programme"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opex-target-months">Target months</Label>
                    <Input
                      id="opex-target-months"
                      type="month"
                      value={opexTargetMonths}
                      onChange={(e) => setOpexTargetMonths(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opex-objectives">Objectives</Label>
                    <Textarea
                      id="opex-objectives"
                      value={opexObjectives}
                      onChange={(e) => setOpexObjectives(e.target.value)}
                      placeholder="What this spending aims to achieve"
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opex-justifications">Justifications (calculation)</Label>
                    <Textarea
                      id="opex-justifications"
                      value={opexJustifications}
                      onChange={(e) => setOpexJustifications(e.target.value)}
                      placeholder="Show how the budget amount was calculated"
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="opex-budget">OPEX budget (RM)</Label>
                      <Input
                        id="opex-budget"
                        inputMode="decimal"
                        value={opexBudget}
                        onChange={(e) =>
                          setOpexBudget(e.target.value.replace(/[^\d.]/g, ""))
                        }
                        placeholder="0.00"
                        className="h-12 rounded-xl tabular-nums"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opex-remarks">Remarks</Label>
                      <Input
                        id="opex-remarks"
                        value={opexRemarks}
                        onChange={(e) => setOpexRemarks(e.target.value)}
                        placeholder="Optional notes"
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canAddOpex}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add operating expenditures (OPEX)
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="capex" className="mt-6">
                <form onSubmit={addCapex} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Code (CAPEX)</Label>
                    <Select value={capexCode} onValueChange={setCapexCode}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select CAPEX code" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPEX_CODES.map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-item">Item</Label>
                    <Input
                      id="capex-item"
                      value={capexItem}
                      onChange={(e) => setCapexItem(e.target.value)}
                      placeholder="e.g. Laboratory microscope"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-justification">Justification</Label>
                    <Textarea
                      id="capex-justification"
                      value={capexJustification}
                      onChange={(e) => setCapexJustification(e.target.value)}
                      placeholder="Why this item is needed"
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-target-months">Target months</Label>
                    <Input
                      id="capex-target-months"
                      type="month"
                      value={capexTargetMonths}
                      onChange={(e) => setCapexTargetMonths(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <div className="flex w-fit items-center gap-1 rounded-full border border-foreground/10 p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCapexQuantity((q) => Math.max(1, q - 1))
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-ivory"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center text-base font-medium tabular-nums">
                          {capexQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCapexQuantity((q) => q + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-ivory"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capex-unit">Estimate cost per unit (RM)</Label>
                      <Input
                        id="capex-unit"
                        inputMode="decimal"
                        value={capexCostPerUnit}
                        onChange={(e) =>
                          setCapexCostPerUnit(e.target.value.replace(/[^\d.]/g, ""))
                        }
                        placeholder="0.00"
                        className="h-12 rounded-xl tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated price</Label>
                    <div className="flex h-12 items-center rounded-xl border border-foreground/10 bg-ivory px-4 font-display text-xl tabular-nums">
                      {formatRm(capexEstimated)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-effect">
                      Effect if budget not approved
                    </Label>
                    <Textarea
                      id="capex-effect"
                      value={capexEffect}
                      onChange={(e) => setCapexEffect(e.target.value)}
                      placeholder="Impact if this request is rejected"
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-alternative">
                      Alternative more cost effective alternative
                    </Label>
                    <Textarea
                      id="capex-alternative"
                      value={capexAlternative}
                      onChange={(e) => setCapexAlternative(e.target.value)}
                      placeholder="Lower-cost options considered"
                      className="min-h-20 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capex-remarks">Remarks</Label>
                    <Input
                      id="capex-remarks"
                      value={capexRemarks}
                      onChange={(e) => setCapexRemarks(e.target.value)}
                      placeholder="Optional notes"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canAddCapex}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add capital expenditures (CAPEX)
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <div className="sticky top-8 self-start flex h-fit flex-col rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Your request</h2>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-lime px-2 text-sm font-medium text-lime-foreground tabular-nums">
                {opexItems.length + capexItems.length}
              </span>
            </div>

            {opexItems.length === 0 && capexItems.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 py-12 text-center">
                <ClipboardList className="h-8 w-8 text-foreground/30" />
                <p className="max-w-48 text-sm text-foreground/50">
                  No lines yet. Add OPEX or CAPEX entries on the left.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {opexItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
                      OPEX
                    </p>
                    <ul className="mt-2 divide-y divide-foreground/10">
                      {opexItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.activity}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-foreground/50">
                              {opexCodeLabel(item.code)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">
                              {formatRm(item.budget)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOpex(item.id)}
                              aria-label="Remove OPEX line"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:bg-ivory hover:text-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {capexItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
                      CAPEX
                    </p>
                    <ul className="mt-2 divide-y divide-foreground/10">
                      {capexItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.item}
                            </p>
                            <p className="mt-0.5 text-xs text-foreground/50">
                              {item.quantity} × {formatRm(item.costPerUnit)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">
                              {formatRm(item.estimatedPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCapex(item.id)}
                              aria-label="Remove CAPEX line"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:bg-ivory hover:text-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-2 rounded-2xl bg-ivory p-4">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">OPEX total</span>
                <span className="font-medium tabular-nums">{formatRm(opexTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">CAPEX total</span>
                <span className="font-medium tabular-nums">{formatRm(capexTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-foreground/10 pt-2 font-display text-xl">
                <span>Grand total</span>
                <span className="tabular-nums">{formatRm(grandTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={
                submitting || (opexItems.length === 0 && capexItems.length === 0)
              }
              className={cn(
                "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime py-2.5 text-sm font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-40",
              )}
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit yearly budget"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

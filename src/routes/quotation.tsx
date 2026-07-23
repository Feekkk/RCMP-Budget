import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Send } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast } from "sonner";
import { Sidebar } from "../user/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CartItem = {
  id: number;
  name: string;
  quantity: number;
  pricePerUnit: number;
  details: string;
};

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function QuotationPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [details, setDetails] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const unitPrice = Number(pricePerUnit) || 0;
  const lineTotal = unitPrice * quantity;
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.pricePerUnit * item.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const canAdd = name.trim() && unitPrice > 0;

  const addItem = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || unitPrice <= 0) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.name.toLowerCase() === trimmed.toLowerCase() &&
          item.pricePerUnit === unitPrice &&
          item.details === details.trim(),
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: Date.now(),
          name: trimmed,
          quantity,
          pricePerUnit: unitPrice,
          details: details.trim(),
        },
      ];
    });
    setName("");
    setQuantity(1);
    setPricePerUnit("");
    setDetails("");
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const submit = () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      toast("Quotation request submitted", {
        description: `${cart.length} item${cart.length > 1 ? "s" : ""} · ${formatRm(cartTotal)} sent to procurement.`,
      });
      navigate({ to: "/user" });
    }, 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <Link
          to="/user"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6">
          <h1 className="font-display text-4xl">Request a quotation</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Add items with quantity and unit price, then submit to procurement.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={addItem}
            className="h-fit rounded-[1.5rem] bg-background p-6 shadow-card md:p-8"
          >
            <h2 className="font-display text-2xl">Add an item</h2>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Input
                  id="item"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ergonomic office chair"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">
                  Details{" "}
                  <span className="font-normal text-foreground/40">(optional)</span>
                </Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Specs, colour, preferred brand…"
                  className="min-h-24 rounded-xl"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex w-fit items-center gap-1 rounded-full border border-foreground/10 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-ivory"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-base font-medium tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-ivory"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per unit (RM)</Label>
                  <Input
                    id="price"
                    inputMode="decimal"
                    value={pricePerUnit}
                    onChange={(e) =>
                      setPricePerUnit(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    placeholder="0.00"
                    className="h-12 rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Line total</Label>
                <div className="flex h-12 items-center rounded-xl border border-foreground/10 bg-ivory px-4 font-display text-xl tabular-nums">
                  {formatRm(lineTotal)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canAdd}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-4 text-base font-medium text-background transition hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add to cart
            </button>
          </form>

          <div className="flex h-fit flex-col rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Your cart</h2>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-lime px-2 text-sm font-medium text-lime-foreground tabular-nums">
                {cartCount}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 py-12 text-center">
                <ShoppingCart className="h-8 w-8 text-foreground/30" />
                <p className="max-w-48 text-sm text-foreground/50">
                  Your cart is empty. Add items on the left to get started.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-foreground/10">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {item.details && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-foreground/50">
                          {item.details}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {formatRm(item.pricePerUnit)} × {item.quantity}
                      </p>
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatRm(item.pricePerUnit * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-foreground/10 p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-ivory"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-ivory"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-4">
              <p className="text-sm text-foreground/60">Total</p>
              <p className="font-display text-2xl tabular-nums">
                {formatRm(cartTotal)}
              </p>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={cart.length === 0 || submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime py-4 text-base font-medium text-lime-foreground transition hover:brightness-95 disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit to procurement"}
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ivory/90 backdrop-blur-sm">
          <DotLottieReact
            src="/receipt.json"
            loop
            autoplay
            className="h-52 w-52"
          />
          <p className="font-display text-2xl">Submitting your request</p>
          <p className="mt-2 text-sm text-foreground/60">
            Sending your quotation to procurement…
          </p>
        </div>
      )}
    </div>
  );
}

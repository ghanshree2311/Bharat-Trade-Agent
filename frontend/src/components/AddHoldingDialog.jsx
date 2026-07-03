import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function AddHoldingDialog({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: "", quantity: "", buy_price: "", buy_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.buy_price) {
      toast.error("Symbol, quantity and buy price are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/holdings", {
        symbol: form.symbol,
        quantity: parseFloat(form.quantity),
        buy_price: parseFloat(form.buy_price),
        buy_date: form.buy_date || null,
        notes: form.notes,
      });
      toast.success(`Added ${form.symbol.toUpperCase()} to portfolio`);
      setForm({ symbol: "", quantity: "", buy_price: "", buy_date: "", notes: "" });
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error("Failed to add holding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="add-holding-button"
          className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white h-9 px-4 gap-2 font-medium"
        >
          <Plus size={16} weight="bold" />
          Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-sm max-w-lg border-[#E5E7EB]" data-testid="add-holding-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4 pt-2">
          <div className="col-span-2">
            <Label className="text-xs uppercase tracking-wider text-[#525252]">NSE Symbol</Label>
            <Input
              data-testid="input-symbol"
              placeholder="e.g. RELIANCE, TCS, HDFCBANK"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              className="mono rounded-sm mt-1 border-[#E5E7EB]"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#525252]">Quantity</Label>
            <Input
              data-testid="input-quantity"
              type="number" step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="mono rounded-sm mt-1 border-[#E5E7EB]"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#525252]">Buy Price (₹)</Label>
            <Input
              data-testid="input-buy-price"
              type="number" step="0.01"
              value={form.buy_price}
              onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
              className="mono rounded-sm mt-1 border-[#E5E7EB]"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs uppercase tracking-wider text-[#525252]">Buy Date (optional)</Label>
            <Input
              data-testid="input-buy-date"
              type="date"
              value={form.buy_date}
              onChange={(e) => setForm({ ...form, buy_date: e.target.value })}
              className="rounded-sm mt-1 border-[#E5E7EB]"
            />
          </div>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm border-[#E5E7EB]">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} data-testid="submit-holding" className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white">
              {saving ? "Saving…" : "Add to portfolio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

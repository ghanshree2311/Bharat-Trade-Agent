import { useEffect, useState } from "react";
import { api, fmtINR, fmtPct } from "../lib/api";
import { Bell, BellRinging, Plus, Trash, Pause, Play, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";

const TYPE_LABEL = {
  target: "Target Price",
  stop_loss: "Stop-Loss",
  pct_change: "% Change",
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: "", alert_type: "target", threshold: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/alerts");
      setAlerts(data.alerts || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.threshold) {
      toast.error("Symbol and threshold required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/alerts", {
        symbol: form.symbol.toUpperCase(),
        alert_type: form.alert_type,
        threshold: parseFloat(form.threshold),
        note: form.note,
      });
      toast.success("Alert created");
      setForm({ symbol: "", alert_type: "target", threshold: "", note: "" });
      setOpen(false);
      await load();
    } catch { toast.error("Failed to create"); }
    setSaving(false);
  };

  const remove = async (id) => {
    try { await api.delete(`/alerts/${id}`); await load(); } catch { toast.error("Failed"); }
  };

  const toggle = async (id) => {
    try { await api.patch(`/alerts/${id}/toggle`); await load(); } catch { toast.error("Failed"); }
  };

  const checkNow = async () => {
    try {
      const { data } = await api.post("/alerts/check");
      toast.success(`Checked ${data.checked} alerts, ${data.triggered} triggered`);
      await load();
    } catch { toast.error("Check failed"); }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-sm" data-testid="alerts-panel">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-3">
        <BellRinging size={18} weight="duotone" color="#D97706" />
        <h3 className="font-display text-base font-semibold">Price Alerts</h3>
        <span className="ml-auto mono text-[11px] uppercase tracking-[0.08em] text-[#525252]">{alerts.length}</span>
        <Button
          onClick={checkNow}
          variant="ghost" size="sm"
          data-testid="check-alerts-btn"
          className="h-7 w-7 p-0 rounded-sm text-[#525252] hover:text-[#0A0A0A]"
          title="Check now"
        >
          <ArrowsClockwise size={14} />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-alert-btn"
              size="sm"
              className="h-7 rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white gap-1 px-2"
            >
              <Plus size={12} weight="bold" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-md border-[#E5E7EB]" data-testid="alert-dialog">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create alert</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3 pt-2">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#525252]">Symbol</Label>
                <Input
                  data-testid="alert-symbol"
                  placeholder="e.g. RELIANCE"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  className="mono rounded-sm mt-1 border-[#E5E7EB]"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#525252]">Alert Type</Label>
                <Select value={form.alert_type} onValueChange={(v) => setForm({ ...form, alert_type: v })}>
                  <SelectTrigger data-testid="alert-type-select" className="rounded-sm mt-1 border-[#E5E7EB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="target">🎯 Target Price (above)</SelectItem>
                    <SelectItem value="stop_loss">🛑 Stop-Loss (below)</SelectItem>
                    <SelectItem value="pct_change">⚡ % Change (day move)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#525252]">
                  {form.alert_type === "pct_change" ? "Threshold (%)" : "Price (₹)"}
                </Label>
                <Input
                  data-testid="alert-threshold"
                  type="number" step="0.01"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                  className="mono rounded-sm mt-1 border-[#E5E7EB]"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#525252]">Note (optional)</Label>
                <Input
                  data-testid="alert-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="rounded-sm mt-1 border-[#E5E7EB]"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} data-testid="submit-alert" className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white">
                  {saving ? "Saving…" : "Create alert"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4">
        {!alerts.length ? (
          <div className="text-center py-6">
            <Bell size={22} weight="duotone" color="#525252" className="mx-auto mb-2" />
            <p className="text-sm text-[#525252]">No alerts yet.</p>
            <p className="text-xs text-[#525252] mt-1">Auto-checks every 5 min · 9:15am–3:30pm IST · Mon–Fri</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="border border-[#E5E7EB] px-3 py-2 flex items-center justify-between hover:bg-gray-50" data-testid={`alert-${a.symbol}-${a.alert_type}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[11px] font-medium uppercase tracking-[0.05em] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5">
                      {a.symbol}
                    </span>
                    <span className="mono text-[10px] uppercase tracking-wider text-[#525252]">{TYPE_LABEL[a.alert_type]}</span>
                    {!a.active && <span className="mono text-[9px] uppercase text-[#DC2626]">paused</span>}
                  </div>
                  <p className="mono text-xs text-[#0A0A0A] mt-1">
                    {a.alert_type === "pct_change"
                      ? `±${a.threshold}%`
                      : (a.alert_type === "target" ? "≥ " : "≤ ") + fmtINR(a.threshold)}
                    {a.triggered_count > 0 && (
                      <span className="ml-2 text-[#525252]">· triggered {a.triggered_count}×</span>
                    )}
                  </p>
                  {a.note && <p className="text-[10px] text-[#525252] mt-0.5 truncate">{a.note}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggle(a.id)} className="h-6 w-6 p-0 rounded-sm text-[#525252]" data-testid={`toggle-alert-${a.id}`}>
                    {a.active ? <Pause size={12} /> : <Play size={12} />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="h-6 w-6 p-0 rounded-sm text-[#525252] hover:text-[#DC2626] hover:bg-[#FEE2E2]" data-testid={`delete-alert-${a.id}`}>
                    <Trash size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

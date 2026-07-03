import { useEffect, useState } from "react";
import { api, fmtINR, fmtPct } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, X, Eye } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [sym, setSym] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/watchlist");
      setItems(data.items || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!sym.trim()) return;
    setLoading(true);
    try {
      await api.post("/watchlist", { symbol: sym.trim().toUpperCase() });
      setSym("");
      toast.success("Added to watchlist");
      await load();
    } catch { toast.error("Failed to add"); }
    setLoading(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/watchlist/${id}`);
      await load();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-sm" data-testid="watchlist">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-3">
        <Eye size={18} weight="duotone" color="#2563EB" />
        <h3 className="font-display text-base font-semibold">Watchlist</h3>
        <span className="ml-auto mono text-[11px] uppercase tracking-[0.08em] text-[#525252]">{items.length}</span>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <Input
            data-testid="watchlist-symbol-input"
            placeholder="Add NSE ticker (e.g., ITC)"
            value={sym}
            onChange={(e) => setSym(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="mono rounded-sm border-[#E5E7EB] h-9"
          />
          <Button
            onClick={add} disabled={loading}
            data-testid="watchlist-add-btn"
            className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white h-9 px-3"
          >
            <Plus size={16} weight="bold" />
          </Button>
        </div>

        {!items.length ? (
          <p className="text-sm text-[#525252] py-6 text-center">No stocks watched yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const up = (it.change_pct || 0) >= 0;
              return (
                <div key={it.id} className="flex items-center justify-between border border-[#E5E7EB] px-3 py-2 hover:bg-gray-50" data-testid={`watch-${it.symbol_display}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="mono text-[11px] font-medium uppercase tracking-[0.05em] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5">
                      {it.symbol_display}
                    </span>
                    <span className="text-xs text-[#525252] truncate">{it.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="mono text-sm tabular-nums">{fmtINR(it.current_price)}</span>
                    <span className="mono text-xs tabular-nums" style={{ color: up ? "#059669" : "#DC2626" }}>
                      {fmtPct(it.change_pct)}
                    </span>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => remove(it.id)}
                      className="h-6 w-6 p-0 text-[#525252] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-sm"
                      data-testid={`remove-watch-${it.symbol_display}`}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

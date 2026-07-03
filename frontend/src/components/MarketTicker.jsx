import { useEffect, useState } from "react";
import { api, fmtNum, fmtPct } from "../lib/api";

export default function MarketTicker() {
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/market/overview");
        setIndices(data.indices || []);
      } catch (e) { /* ignore */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const items = indices.length ? [...indices, ...indices] : [];

  return (
    <div
      className="border-b border-[#E5E7EB] bg-white overflow-hidden"
      data-testid="market-ticker"
    >
      <div className="ticker-track py-2.5">
        {items.map((it, i) => {
          const up = it.change_pct >= 0;
          return (
            <div key={i} className="flex items-center gap-3 px-6 shrink-0">
              <span className="mono text-[11px] uppercase tracking-[0.08em] text-[#525252]">{it.label}</span>
              <span className="mono text-sm text-[#0A0A0A] tabular-nums">{fmtNum(it.price)}</span>
              <span
                className="mono text-xs tabular-nums"
                style={{ color: up ? "#059669" : "#DC2626" }}
              >
                {fmtPct(it.change_pct)}
              </span>
              <span className="text-[#E5E7EB]">|</span>
            </div>
          );
        })}
        {!items.length && (
          <div className="px-6 py-1 text-xs text-[#525252]">Loading Indian markets…</div>
        )}
      </div>
    </div>
  );
}

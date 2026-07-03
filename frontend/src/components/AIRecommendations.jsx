import { useState, useEffect } from "react";
import { ArrowsClockwise, Warning, Rocket, Diamond, Sparkle } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { api, fmtINR, fmtPct } from "../lib/api";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";

const ConfBadge = ({ level }) => {
  const map = { High: "#059669", Medium: "#D97706", Low: "#525252" };
  const c = map[level] || "#525252";
  return (
    <span className="mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 border" style={{ color: c, borderColor: c }}>
      {level || "—"}
    </span>
  );
};

const RecCard = ({ item, kind, tone }) => {
  const bg = tone === "loss" ? "#FEE2E2" : tone === "profit" ? "#D1FAE5" : "#EFF6FF";
  const border = tone === "loss" ? "#FCA5A5" : tone === "profit" ? "#6EE7B7" : "#BFDBFE";
  return (
    <div
      data-testid={`rec-${kind}-${item.symbol}`}
      className="border p-4 rounded-sm hover:bg-gray-50 transition-colors duration-150"
      style={{ borderColor: "#E5E7EB", background: "#FFFFFF" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono text-[11px] font-medium uppercase tracking-[0.05em] border px-1.5 py-0.5" style={{ backgroundColor: bg, borderColor: border }}>
              {item.symbol}
            </span>
            {item.action && (
              <span className="mono text-[10px] uppercase text-[#DC2626] font-semibold">{item.action}</span>
            )}
          </div>
          <p className="text-sm font-medium mt-1 text-[#0A0A0A]">{item.name}</p>
          {item.sector && <p className="text-xs text-[#525252]">{item.sector}</p>}
        </div>
        <ConfBadge level={item.confidence} />
      </div>
      <p className="text-xs text-[#525252] leading-relaxed">{item.reason}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E7EB]">
        <div className="mono text-xs tabular-nums">
          {item.current_price ? fmtINR(item.current_price) : ""}
          {item.change_pct !== undefined && (
            <span className="ml-2" style={{ color: item.change_pct >= 0 ? "#059669" : "#DC2626" }}>
              {fmtPct(item.change_pct)}
            </span>
          )}
        </div>
        {item.target_price_inr && (
          <div className="mono text-[11px] text-[#525252]">Target: <span className="text-[#0A0A0A]">{fmtINR(item.target_price_inr)}</span></div>
        )}
        {item.horizon_years && (
          <div className="mono text-[11px] text-[#525252]">Horizon: <span className="text-[#0A0A0A]">{item.horizon_years}y</span></div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, tone, items, kind, empty }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-sm" data-testid={`section-${kind}`}>
    <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-3">
      <Icon size={18} weight="duotone" color={tone === "loss" ? "#DC2626" : tone === "profit" ? "#059669" : "#2563EB"} />
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <span className="ml-auto mono text-[11px] uppercase tracking-[0.08em] text-[#525252]">{items?.length || 0}</span>
    </div>
    <div className="p-4 grid grid-cols-1 gap-3">
      {items?.length ? items.map((it, i) => <RecCard key={i} item={it} kind={kind} tone={tone} />) : (
        <p className="text-sm text-[#525252] py-6 text-center">{empty}</p>
      )}
    </div>
  </div>
);

export default function AIRecommendations({ hasHoldings }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initLoad, setInitLoad] = useState(true);

  const loadLatest = async () => {
    try {
      const { data } = await api.get("/ai/recommendations/latest");
      if (data && data.new_buys) setData(data);
    } catch (e) { /* ignore */ }
    setInitLoad(false);
  };

  useEffect(() => { loadLatest(); }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/ai/recommendations");
      setData(data);
      toast.success("AI recommendations refreshed");
    } catch (e) {
      toast.error("Failed to generate recommendations");
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="ai-recommendations">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkle size={18} weight="duotone" color="#2563EB" />
            <h2 className="font-display text-2xl font-semibold">AI Trade Agent</h2>
          </div>
          <p className="text-sm text-[#525252] mt-1">AI-powered Indian equity analysis</p>
        </div>
        <Button
          data-testid="generate-recommendations-btn"
          onClick={generate}
          disabled={loading}
          className="rounded-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 h-9 px-4"
        >
          <ArrowsClockwise size={14} weight="bold" className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing…" : data ? "Refresh Analysis" : "Generate Insights"}
        </Button>
      </div>

      {data?.portfolio_health && (
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm mb-4" data-testid="portfolio-health">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.1em] text-[#525252]">Diversification</p>
              <p className="text-sm mt-1 text-[#0A0A0A]">{data.portfolio_health.diversification}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.1em] text-[#525252]">Risk Level</p>
              <p className="text-sm mt-1 text-[#0A0A0A] font-medium">{data.portfolio_health.risk_level}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.1em] text-[#525252]">Key Insight</p>
              <p className="text-sm mt-1 text-[#0A0A0A]">{data.portfolio_health.key_insight}</p>
            </div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-sm" />)}
        </div>
      )}

      {!loading && !data && !initLoad && (
        <div className="bg-white border border-dashed border-[#E5E7EB] p-12 text-center rounded-sm">
          <Sparkle size={32} weight="duotone" color="#2563EB" className="mx-auto mb-3" />
          <p className="font-display text-lg text-[#0A0A0A]">Ready for AI-powered analysis</p>
          <p className="text-sm text-[#525252] mt-1 mb-4">
            {hasHoldings ? "Generate insights based on your live portfolio." : "Add a few holdings, then generate AI insights."}
          </p>
          <Button onClick={generate} className="rounded-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="generate-empty-btn">
            Generate Now
          </Button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section
            title="Safe Exits" icon={Warning} tone="loss"
            items={data.safe_exits} kind="exits"
            empty="No exit signals — your portfolio looks healthy."
          />
          <Section
            title="New Buys" icon={Rocket} tone="profit"
            items={data.new_buys} kind="buys"
            empty="No new opportunities yet."
          />
          <Section
            title="Long-term Value Picks" icon={Diamond} tone="brand"
            items={data.long_term_picks} kind="longterm"
            empty="No hidden gems today."
          />
        </div>
      )}
    </div>
  );
}

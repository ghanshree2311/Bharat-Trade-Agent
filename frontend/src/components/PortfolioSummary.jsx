import { fmtINR, fmtPct } from "../lib/api";
import { Wallet, TrendUp, TrendDown, ChartLine } from "@phosphor-icons/react";

const Metric = ({ label, value, sub, tone, icon: Icon, testId }) => {
  const color = tone === "profit" ? "#059669" : tone === "loss" ? "#DC2626" : "#0A0A0A";
  return (
    <div
      data-testid={testId}
      className="bg-white border border-[#E5E7EB] p-5 rounded-sm flex items-start justify-between"
    >
      <div>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-[#525252] mb-2">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums" style={{ color }}>{value}</p>
        {sub && <p className="mono text-xs mt-1 tabular-nums" style={{ color }}>{sub}</p>}
      </div>
      {Icon && (
        <div className="p-2 bg-[#F3F4F6] border border-[#E5E7EB]">
          <Icon size={18} weight="duotone" color={color} />
        </div>
      )}
    </div>
  );
};

export default function PortfolioSummary({ summary }) {
  const pnlTone = (summary?.pnl || 0) >= 0 ? "profit" : "loss";
  const dayTone = (summary?.day_change || 0) >= 0 ? "profit" : "loss";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="portfolio-summary">
      <Metric
        label="Invested"
        value={fmtINR(summary?.invested || 0)}
        icon={Wallet}
        testId="metric-invested"
      />
      <Metric
        label="Current Value"
        value={fmtINR(summary?.current_value || 0)}
        icon={ChartLine}
        testId="metric-current-value"
      />
      <Metric
        label="Overall P/L"
        value={fmtINR(summary?.pnl || 0)}
        sub={fmtPct(summary?.pnl_pct || 0)}
        tone={pnlTone}
        icon={pnlTone === "profit" ? TrendUp : TrendDown}
        testId="metric-pnl"
      />
      <Metric
        label="Day Change"
        value={fmtINR(summary?.day_change || 0)}
        tone={dayTone}
        icon={dayTone === "profit" ? TrendUp : TrendDown}
        testId="metric-day-change"
      />
    </div>
  );
}

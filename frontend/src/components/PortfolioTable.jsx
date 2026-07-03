import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Trash, ChartLineUp, ChartLineDown } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { fmtINR, fmtPct, fmtNum, api } from "../lib/api";
import { toast } from "sonner";

export default function PortfolioTable({ holdings, onChange }) {
  const remove = async (id, symbol) => {
    try {
      await api.delete(`/holdings/${id}`);
      toast.success(`${symbol} removed`);
      onChange?.();
    } catch { toast.error("Failed to remove"); }
  };

  if (!holdings.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] p-12 text-center rounded-sm" data-testid="empty-portfolio">
        <p className="font-display text-xl text-[#0A0A0A] mb-2">Your portfolio is empty</p>
        <p className="text-sm text-[#525252]">Add your first Indian equity holding to get live P/L and AI insights.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-sm" data-testid="portfolio-table">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3">
        <h3 className="font-display text-lg font-semibold">Holdings</h3>
        <span className="mono text-[11px] uppercase tracking-[0.08em] text-[#525252]">{holdings.length} positions</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-[#E5E7EB] hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252]">Ticker</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">Qty</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">Avg Cost</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">LTP</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">Day %</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">Invested</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">Current</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">P/L</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.08em] text-[#525252] text-right">P/L %</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const up = h.pnl >= 0;
            const dayUp = (h.change_pct || 0) >= 0;
            return (
              <TableRow key={h.id} className="border-[#E5E7EB] hover:bg-gray-50" data-testid={`holding-row-${h.symbol_display}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[11px] font-medium uppercase tracking-[0.05em] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5">
                      {h.symbol_display}
                    </span>
                    <span className="text-xs text-[#525252] truncate max-w-[180px]">{h.name}</span>
                  </div>
                </TableCell>
                <TableCell className="mono text-sm text-right tabular-nums">{fmtNum(h.quantity)}</TableCell>
                <TableCell className="mono text-sm text-right tabular-nums">{fmtINR(h.buy_price)}</TableCell>
                <TableCell className="mono text-sm text-right tabular-nums font-medium">{fmtINR(h.current_price)}</TableCell>
                <TableCell className="mono text-sm text-right tabular-nums" style={{ color: dayUp ? "#059669" : "#DC2626" }}>
                  {fmtPct(h.change_pct)}
                </TableCell>
                <TableCell className="mono text-sm text-right tabular-nums text-[#525252]">{fmtINR(h.invested_value)}</TableCell>
                <TableCell className="mono text-sm text-right tabular-nums">{fmtINR(h.current_value)}</TableCell>
                <TableCell className="mono text-sm text-right tabular-nums" style={{ color: up ? "#059669" : "#DC2626" }}>
                  {up ? "+" : ""}{fmtINR(Math.abs(h.pnl))}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className="inline-flex items-center gap-1 mono text-xs px-1.5 py-0.5 font-medium"
                    style={{
                      color: up ? "#059669" : "#DC2626",
                      backgroundColor: up ? "#D1FAE5" : "#FEE2E2",
                    }}
                  >
                    {up ? <ChartLineUp size={12} weight="bold" /> : <ChartLineDown size={12} weight="bold" />}
                    {fmtPct(h.pnl_pct)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="sm"
                    data-testid={`delete-holding-${h.symbol_display}`}
                    onClick={() => remove(h.id, h.symbol_display)}
                    className="h-7 w-7 p-0 text-[#525252] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-sm"
                  >
                    <Trash size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

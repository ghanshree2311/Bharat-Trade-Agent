import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TrendUp } from "@phosphor-icons/react";
import { api } from "./lib/api";
import MarketTicker from "./components/MarketTicker";
import PortfolioSummary from "./components/PortfolioSummary";
import PortfolioTable from "./components/PortfolioTable";
import AddHoldingDialog from "./components/AddHoldingDialog";
import AIRecommendations from "./components/AIRecommendations";
import Watchlist from "./components/Watchlist";
import SettingsDialog from "./components/SettingsDialog";
import AlertsPanel from "./components/AlertsPanel";

function Dashboard() {
  const [portfolio, setPortfolio] = useState({ holdings: [], summary: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/holdings");
      setPortfolio(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <MarketTicker />

      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB]" data-testid="app-header">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-[#0A0A0A] flex items-center justify-center">
              <TrendUp size={20} weight="bold" color="#FFFFFF" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight">Bharat Trade Agent</h1>
              <p className="mono text-[10px] uppercase tracking-[0.1em] text-[#525252]">NSE · BSE · AI-Powered Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SettingsDialog onChange={load} />
            <AddHoldingDialog onAdded={load} />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        {/* Portfolio section */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl font-semibold" data-testid="portfolio-title">Portfolio</h2>
            <span className="mono text-[11px] uppercase tracking-[0.1em] text-[#525252]">
              Live · Auto-refresh 60s
            </span>
          </div>
          <PortfolioSummary summary={portfolio.summary} />
          <PortfolioTable holdings={portfolio.holdings || []} onChange={load} />
        </section>

        {/* Grid: AI + Watchlist */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <AIRecommendations hasHoldings={(portfolio.holdings || []).length > 0} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <AlertsPanel />
            <Watchlist />
          </div>
        </section>

        <footer className="pt-8 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#525252]">
            Data via Yahoo Finance · Analysis is informational, not investment advice.
          </p>
        </footer>
      </main>

      <Toaster position="bottom-right" theme="light" />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

# Bharat Trade Agent — PRD

## Original problem statement
> I want an Indian trade agent, which based on my portfolio, suggests me new stocks to invest in, safe exits from depreciating stocks, and stocks currently underperforming but with strong long-term potential.

## User persona
Indian retail investor tracking NSE/BSE equities who wants AI-driven analysis on top of live portfolio P/L.

## Decisions (defaults applied — user skipped clarifications)
- Portfolio input: manual (symbol, qty, buy price)
- Market data: **Yahoo Finance via `yfinance`** (Indian tickers auto-suffixed with `.NS`)
- AI engine: **OpenAI GPT-5.4** via Emergent Universal LLM key (initial choice was Claude Sonnet 4.6 but budget on key was 0 for it; falling back to gpt-5.4 worked)
- Auth: none (single-user local)

## Architecture
- **Backend** (FastAPI + Motor/MongoDB) — `/app/backend/server.py`
  - `/api/holdings` CRUD, `/api/watchlist` CRUD
  - `/api/market/overview`, `/api/quote/{symbol}` (live + 6-mo history)
  - `/api/ai/recommendations` (POST → LLM JSON: safe_exits, new_buys, long_term_picks, portfolio_health)
  - `/api/ai/recommendations/latest` (persisted last run)
  - `/api/ai/analyze/{symbol}` (single-stock verdict)
- **Frontend** (React + Tailwind + Shadcn UI)
  - `App.js` dashboard, `MarketTicker`, `PortfolioSummary`, `PortfolioTable`, `AddHoldingDialog`, `AIRecommendations`, `Watchlist`
  - Swiss / high-contrast institutional theme (Outfit + IBM Plex Sans/Mono)

## Implemented (2026-02)
- Portfolio dashboard with live NSE prices, aggregate P/L, day change
- Manual add/delete holdings; ticker-tape indices bar (NIFTY/SENSEX/BANKNIFTY/NIFTY IT)
- Watchlist with live quotes
- AI Trade Agent panel: 3 columns (Safe Exits / New Buys / Long-term Value Picks) + portfolio health strip
- **Price Alerts (Telegram)** — target price, stop-loss, ±% change · APScheduler runs checks every 5 min IST during 9:15am–3:30pm Mon–Fri · de-dup 4hr window
- **Groww broker linking** — Settings dialog stores encrypted token (masked in reads) · `/api/broker/groww/sync` imports holdings via `growwapi` SDK · UI shows subscription & static-IP whitelisting instructions

## Backlog (P1 / P2)
- CSV import of holdings
- Individual stock detail view with sparkline (backend already returns history)
- Sector allocation pie & concentration risk metrics
- Auth (JWT or Emergent Google) for multi-user portfolios
- Explicit clear endpoint for Telegram/Groww tokens (currently partial-update only)

## Non-goals
- Automated order placement (never touch broker APIs for execution in v1)
- Investment advice guarantees — recommendations are informational

# 🇮🇳 Bharat Trade Agent

**An AI-powered Indian stock portfolio dashboard with live NSE prices, LLM-driven trade recommendations, Telegram alerts, and Groww broker sync.**

Track your holdings, get safe-exit signals when a stock is about to hit trouble, discover long-term value picks, and receive Telegram notifications the moment a stop-loss or price target triggers — all in one dashboard.

---

## ✨ Features

| Module | What it does |
|---|---|
| **Portfolio Dashboard** | Live NSE prices via Yahoo Finance · aggregate invested / current value / P&L / day change · auto-refresh every 60 s |
| **AI Trade Agent** | LLM (Claude / GPT via Emergent Universal Key) analyzes your portfolio → produces **Safe Exits · New Buys · Long-term Value Picks · Portfolio Health** |
| **Watchlist** | Track stocks you don't own yet with live quotes |
| **Price Alerts** | Target price ↑ · Stop-loss ↓ · ±% day-change · pause/resume · 4-hour de-dup |
| **Telegram Notifications** | APScheduler auto-checks every 5 min during Indian market hours (9:15am–3:30pm IST, Mon–Fri) and pushes alerts to your Telegram |
| **Groww Broker Sync** | Import your Groww holdings via the official `growwapi` SDK (requires ₹499/mo Groww Trading API subscription) |
| **Market Ticker** | Live scrolling NIFTY 50 / SENSEX / BANK NIFTY / NIFTY IT |

---

## 🧱 Tech Stack

- **Frontend**: React 18 · Tailwind CSS · Shadcn UI · phosphor-icons · sonner (toasts) · axios
- **Backend**: FastAPI · Motor (async MongoDB) · APScheduler · yfinance · httpx · emergentintegrations (LLM)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.4 (default) or Claude Sonnet via [Emergent Universal LLM Key](https://emergent.sh)

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py          # All FastAPI endpoints + scheduler
│   ├── requirements.txt   # Python deps (pip freeze)
│   └── .env               # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, CORS_ORIGINS
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/    # PortfolioTable, AIRecommendations, AlertsPanel, SettingsDialog, ...
│   │   ├── lib/api.js     # Axios wrapper + formatters
│   │   └── components/ui/ # Shadcn primitives
│   ├── package.json
│   └── .env               # REACT_APP_BACKEND_URL
└── README.md
```

---

## 🚀 Running Locally

### Prerequisites
- **Python 3.11+**
- **Node 18+ / Yarn** (do NOT use npm — use yarn)
- **MongoDB 6+** (local or MongoDB Atlas free tier)

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd bharat-trade-agent
```

### 2. Backend setup
```bash
cd backend

# create venv (optional but recommended)
python -m venv .venv && source .venv/bin/activate

# install deps
pip install -r requirements.txt

# create .env  (see "Environment variables" below)
cp .env.example .env    # or create manually

# start
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend now on **http://localhost:8001** · docs at http://localhost:8001/docs

### 3. Frontend setup
```bash
cd ../frontend

# create .env with your backend URL:
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# install & start
yarn install
yarn start
```

Frontend now on **http://localhost:3000**

### 4. MongoDB
Either run locally (`mongod`), or use a free MongoDB Atlas M0 cluster and paste the connection string into `backend/.env`.

---

## 🔐 Environment Variables

### `backend/.env`
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=bharat_trade
CORS_ORIGINS=*
EMERGENT_LLM_KEY=sk-emergent-xxxxxxxxxxxxxxxx
```

- `MONGO_URL` — local Mongo or Atlas connection string
- `DB_NAME` — any name (e.g. `bharat_trade`)
- `EMERGENT_LLM_KEY` — get one from [emergent.sh](https://emergent.sh) → Profile → Universal Key. Works with OpenAI, Claude & Gemini. Alternatively, modify `server.py` to use your own OpenAI/Anthropic key directly.
- `CORS_ORIGINS` — comma-separated, `*` for dev

### `frontend/.env`
```
REACT_APP_BACKEND_URL=http://localhost:8001
```
(Change to your deployed backend URL after deploying.)

---

## 🔔 Telegram Bot Setup (2 minutes, free)

1. Open Telegram → search **@BotFather** → send `/newbot` → follow prompts → copy the **Bot Token**
2. Search for your new bot in Telegram → tap **Start** → send any message (e.g. "hi")
3. Open the app → **Settings** (top-right) → **Telegram** tab
4. Paste the bot token → click **Save**
5. Click **Auto-detect Chat ID** — the app will fetch your chat ID from Telegram automatically
6. Click **Send Test** — you should receive a confirmation message

Alerts now fire to your Telegram every 5 min during market hours.

---

## 🏦 Groww Broker Sync (Optional · ₹499/month)

1. Open Groww app → **Profile → Trading API** → subscribe (₹499/month)
2. Visit `groww.in/trade-api` → generate an **Access Token** (use TOTP flow — no expiry)
3. **SEBI compliance**: Whitelist your server's static IP in the Groww dashboard (this is why you need a stable-IP deployment, not a shared-IP free tier)
4. In app → **Settings → Groww** tab → paste token → **Save Token** → **Sync Holdings**

---

## ☁️ Deployment Options

### Option 1 — Emergent Deploy (Easiest · 50 credits/month)
1. Click **Deploy** in your Emergent workspace
2. That's it — you get a live URL, static IP (Groww-friendly), and 24/7 scheduler

### Option 2 — Render + Vercel (Free tier, small caveats)
- **Backend on Render Free**: Push repo to GitHub → New Web Service → build cmd `pip install -r requirements.txt` → start cmd `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Caveat**: Render free spins down after 15 min inactivity. Use [cron-job.org](https://cron-job.org) to ping `https://your-app.onrender.com/api/` every 10 min to keep it awake (unreliable for scheduler but works most of the time)
- **Frontend on Vercel** or **Netlify** free tier (auto-deploys from GitHub)
- **DB**: MongoDB Atlas M0 (free 512 MB)

### Option 3 — Railway (~$5/month, always-on)
1. Push repo to GitHub
2. Railway → New Project → Deploy from GitHub → select repo
3. Add env vars (MONGO_URL, DB_NAME, EMERGENT_LLM_KEY)
4. Railway auto-detects FastAPI + React and deploys both

### Option 4 — Oracle Cloud Free VM (Truly free forever)
Oracle offers **4 ARM CPUs + 24 GB RAM** always-free. Requires Linux/Docker familiarity.

```bash
# On the Oracle VM (Ubuntu):
sudo apt update && sudo apt install -y python3.11 python3-pip nodejs npm mongodb
git clone <your-repo>
cd bharat-trade-agent

# Backend
cd backend && pip install -r requirements.txt
# Create systemd service for uvicorn (see Option 4b below)

# Frontend (build once, serve with nginx)
cd ../frontend && yarn install && yarn build
sudo apt install nginx
# Copy build/ to /var/www/html and configure nginx as reverse proxy to :8001
```

### Option 4b — Docker on any VPS
Add these two files to the repo:

**`Dockerfile.backend`**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**`Dockerfile.frontend`**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
```

**`docker-compose.yml`**
```yaml
version: "3.8"
services:
  mongo:
    image: mongo:6
    volumes: ["mongo-data:/data/db"]
  backend:
    build: {context: ., dockerfile: Dockerfile.backend}
    environment:
      MONGO_URL: mongodb://mongo:27017
      DB_NAME: bharat_trade
      EMERGENT_LLM_KEY: ${EMERGENT_LLM_KEY}
      CORS_ORIGINS: "*"
    depends_on: [mongo]
    ports: ["8001:8001"]
  frontend:
    build: {context: ., dockerfile: Dockerfile.frontend}
    ports: ["80:80"]
    depends_on: [backend]
volumes:
  mongo-data:
```

Run:
```bash
export EMERGENT_LLM_KEY=sk-emergent-xxxx
docker compose up -d
```

---

## 📡 API Reference (backend)

All endpoints prefixed with `/api`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/holdings` | List portfolio holdings with live P&L |
| POST | `/holdings` | Add a holding `{symbol, quantity, buy_price}` |
| PATCH | `/holdings/{id}` | Update a holding |
| DELETE | `/holdings/{id}` | Remove a holding |
| GET | `/watchlist` | List watchlist with live quotes |
| POST | `/watchlist` | Add to watchlist |
| DELETE | `/watchlist/{id}` | Remove |
| GET | `/market/overview` | Live NIFTY / SENSEX / BANK NIFTY / NIFTY IT |
| GET | `/quote/{symbol}` | Live quote + 6-month history |
| POST | `/ai/recommendations` | Run LLM analysis on portfolio |
| GET | `/ai/recommendations/latest` | Last saved recommendation |
| POST | `/ai/analyze/{symbol}` | Deep-dive AI verdict on one stock |
| GET/PUT | `/settings` | Get/update Telegram + Groww tokens |
| POST | `/settings/telegram/test` | Send test Telegram message |
| POST | `/settings/telegram/autodetect` | Auto-detect chat ID from getUpdates |
| GET/POST | `/alerts` | List/create price alerts |
| DELETE | `/alerts/{id}` | Remove alert |
| PATCH | `/alerts/{id}/toggle` | Pause/resume alert |
| POST | `/alerts/check` | Manual trigger of alert check |
| POST | `/broker/groww/sync` | Import holdings from Groww |

Auto-generated docs at `<backend-url>/docs` (Swagger).

---

## 🎯 Ticker Format

- Indian NSE stocks: use plain tickers like `RELIANCE`, `TCS`, `HDFCBANK` (the backend appends `.NS` automatically for Yahoo Finance)
- ETFs work too: `BSLNIFTY`, `TATSILV`, `NIFTYBEES`, `GOLDBEES`, etc.
- BSE: append `.BO` manually if needed (e.g. `500325.BO`)

---

## 🛠️ Troubleshooting

| Symptom | Fix |
|---|---|
| Prices show ₹0 | yfinance was throttled by Yahoo. Wait 1–2 min and refresh. |
| AI returns 500 error | `EMERGENT_LLM_KEY` invalid or out of balance. Check Profile → Universal Key on emergent.sh |
| Telegram test fails | Bot token wrong, or you haven't messaged the bot yet (see setup step 2) |
| Groww sync fails | Server IP not whitelisted, or subscription expired, or token expired |
| Scheduler not firing | On free hosts that sleep, the scheduler pauses. Deploy to always-on host (Emergent / Railway / Oracle) |
| `Budget has been exceeded` | The LLM model isn't allowed on your key. In `server.py` change model to `openai/gpt-5.4` (proven working) |

---

## ⚠️ Disclaimer

This app provides **informational analysis only**. It is **not investment advice**, not SEBI-registered, and not a substitute for professional guidance. Recommendations are AI-generated opinions based on public data. **Trade at your own risk.** The authors bear no responsibility for financial losses.

---

## 📝 License

MIT — do what you want with it. Attribution appreciated.

---

## 🙌 Credits

- Live market data: [Yahoo Finance](https://finance.yahoo.com) via `yfinance`
- AI: [Emergent Universal LLM Key](https://emergent.sh) (OpenAI / Anthropic / Google)
- UI primitives: [shadcn/ui](https://ui.shadcn.com) · [phosphor-icons](https://phosphoricons.com)
- Broker sync: [growwapi](https://groww.in/trade-api)

Built with ♥ for Indian retail investors.

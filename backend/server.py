from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import yfinance as yf
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Bharat Trade Agent")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ Models ============
class Holding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str  # e.g. "RELIANCE" (we append .NS)
    name: Optional[str] = None
    quantity: float
    buy_price: float
    buy_date: Optional[str] = None
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class HoldingCreate(BaseModel):
    symbol: str
    quantity: float
    buy_price: float
    buy_date: Optional[str] = None
    notes: Optional[str] = ""


class HoldingUpdate(BaseModel):
    symbol: Optional[str] = None
    quantity: Optional[float] = None
    buy_price: Optional[float] = None
    buy_date: Optional[str] = None
    notes: Optional[str] = ""


class WatchlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    name: Optional[str] = None
    target_price: Optional[float] = None
    note: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WatchlistCreate(BaseModel):
    symbol: str
    target_price: Optional[float] = None
    note: Optional[str] = ""


# ============ Helpers ============
def normalize_symbol(sym: str) -> str:
    sym = sym.strip().upper()
    if "." not in sym:
        sym = sym + ".NS"  # default NSE
    return sym


def display_symbol(sym: str) -> str:
    return sym.replace(".NS", "").replace(".BO", "")


async def fetch_quote(symbol: str) -> Dict[str, Any]:
    """Fetch live quote using yfinance in a threadpool."""
    def _fetch():
        try:
            t = yf.Ticker(symbol)
            fast = t.fast_info
            price = float(fast.get("last_price") or 0) or float(fast.get("lastPrice") or 0)
            prev = float(fast.get("previous_close") or 0) or float(fast.get("previousClose") or 0)
            currency = fast.get("currency") or "INR"
            day_high = float(fast.get("day_high") or 0) or float(fast.get("dayHigh") or 0)
            day_low = float(fast.get("day_low") or 0) or float(fast.get("dayLow") or 0)
            year_high = float(fast.get("year_high") or 0) or float(fast.get("yearHigh") or 0)
            year_low = float(fast.get("year_low") or 0) or float(fast.get("yearLow") or 0)

            name = None
            try:
                info = t.info or {}
                name = info.get("longName") or info.get("shortName")
            except Exception:
                name = None

            change = price - prev if (price and prev) else 0
            change_pct = (change / prev * 100) if prev else 0
            return {
                "symbol": symbol,
                "display": display_symbol(symbol),
                "name": name or display_symbol(symbol),
                "price": round(price, 2),
                "previous_close": round(prev, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "currency": currency,
                "day_high": round(day_high, 2),
                "day_low": round(day_low, 2),
                "year_high": round(year_high, 2),
                "year_low": round(year_low, 2),
            }
        except Exception as e:
            logger.warning(f"Quote fetch failed for {symbol}: {e}")
            return {
                "symbol": symbol, "display": display_symbol(symbol),
                "name": display_symbol(symbol), "price": 0, "previous_close": 0,
                "change": 0, "change_pct": 0, "currency": "INR",
                "day_high": 0, "day_low": 0, "year_high": 0, "year_low": 0, "error": str(e),
            }

    return await asyncio.to_thread(_fetch)


async def fetch_history(symbol: str, period: str = "6mo") -> List[Dict[str, Any]]:
    def _fetch():
        try:
            t = yf.Ticker(symbol)
            h = t.history(period=period)
            out = []
            for idx, row in h.iterrows():
                out.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "close": round(float(row["Close"]), 2),
                })
            return out
        except Exception as e:
            logger.warning(f"History fetch failed for {symbol}: {e}")
            return []
    return await asyncio.to_thread(_fetch)


# ============ Portfolio Endpoints ============
@api_router.get("/")
async def root():
    return {"message": "Bharat Trade Agent API"}


@api_router.get("/holdings")
async def list_holdings():
    docs = await db.holdings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not docs:
        return {"holdings": [], "summary": {"invested": 0, "current_value": 0, "pnl": 0, "pnl_pct": 0, "day_change": 0}}

    # Fetch quotes concurrently
    symbols = [normalize_symbol(d["symbol"]) for d in docs]
    quotes = await asyncio.gather(*[fetch_quote(s) for s in symbols])
    quote_map = {q["symbol"]: q for q in quotes}

    invested = 0.0
    current_value = 0.0
    day_change_value = 0.0

    enriched = []
    for d in docs:
        sym = normalize_symbol(d["symbol"])
        q = quote_map.get(sym, {})
        price = q.get("price", 0) or 0
        qty = d["quantity"]
        buy = d["buy_price"]
        cost = qty * buy
        cur_val = qty * price
        pnl = cur_val - cost
        pnl_pct = (pnl / cost * 100) if cost else 0
        day_c = qty * (q.get("change", 0) or 0)

        invested += cost
        current_value += cur_val
        day_change_value += day_c

        enriched.append({
            **d,
            "symbol_display": display_symbol(sym),
            "name": q.get("name") or d.get("name") or display_symbol(sym),
            "current_price": price,
            "change": q.get("change", 0),
            "change_pct": q.get("change_pct", 0),
            "current_value": round(cur_val, 2),
            "invested_value": round(cost, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "day_change_value": round(day_c, 2),
            "year_high": q.get("year_high", 0),
            "year_low": q.get("year_low", 0),
        })

    pnl_total = current_value - invested
    return {
        "holdings": enriched,
        "summary": {
            "invested": round(invested, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl_total, 2),
            "pnl_pct": round((pnl_total / invested * 100) if invested else 0, 2),
            "day_change": round(day_change_value, 2),
        },
    }


@api_router.post("/holdings")
async def create_holding(inp: HoldingCreate):
    h = Holding(**inp.model_dump())
    h.symbol = display_symbol(normalize_symbol(h.symbol))
    doc = h.model_dump()
    await db.holdings.insert_one(doc)
    return h


@api_router.patch("/holdings/{holding_id}")
async def update_holding(holding_id: str, inp: HoldingUpdate):
    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "no fields to update")
    if "symbol" in update:
        update["symbol"] = display_symbol(normalize_symbol(update["symbol"]))
    res = await db.holdings.update_one({"id": holding_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "not found")
    doc = await db.holdings.find_one({"id": holding_id}, {"_id": 0})
    return doc


@api_router.delete("/holdings/{holding_id}")
async def delete_holding(holding_id: str):
    res = await db.holdings.delete_one({"id": holding_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "not found")
    return {"ok": True}


# ============ Watchlist Endpoints ============
@api_router.get("/watchlist")
async def list_watchlist():
    docs = await db.watchlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not docs:
        return {"items": []}
    symbols = [normalize_symbol(d["symbol"]) for d in docs]
    quotes = await asyncio.gather(*[fetch_quote(s) for s in symbols])
    quote_map = {q["symbol"]: q for q in quotes}
    enriched = []
    for d in docs:
        sym = normalize_symbol(d["symbol"])
        q = quote_map.get(sym, {})
        enriched.append({
            **d,
            "symbol_display": display_symbol(sym),
            "name": q.get("name") or d.get("name") or display_symbol(sym),
            "current_price": q.get("price", 0),
            "change": q.get("change", 0),
            "change_pct": q.get("change_pct", 0),
            "year_high": q.get("year_high", 0),
            "year_low": q.get("year_low", 0),
        })
    return {"items": enriched}


@api_router.post("/watchlist")
async def create_watchlist(inp: WatchlistCreate):
    w = WatchlistItem(**inp.model_dump())
    w.symbol = display_symbol(normalize_symbol(w.symbol))
    await db.watchlist.insert_one(w.model_dump())
    return w


@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist(item_id: str):
    res = await db.watchlist.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "not found")
    return {"ok": True}


# ============ Market / Quotes ============
MARKET_INDICES = [
    ("^NSEI", "NIFTY 50"),
    ("^BSESN", "SENSEX"),
    ("^NSEBANK", "BANK NIFTY"),
    ("^CNXIT", "NIFTY IT"),
]


@api_router.get("/market/overview")
async def market_overview():
    quotes = await asyncio.gather(*[fetch_quote(s) for s, _ in MARKET_INDICES])
    result = []
    for (sym, label), q in zip(MARKET_INDICES, quotes):
        result.append({
            "symbol": sym,
            "label": label,
            "price": q.get("price", 0),
            "change": q.get("change", 0),
            "change_pct": q.get("change_pct", 0),
        })
    return {"indices": result}


@api_router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    sym = normalize_symbol(symbol)
    q = await fetch_quote(sym)
    hist = await fetch_history(sym, "6mo")
    return {"quote": q, "history": hist}


# ============ AI Recommendations ============
def _extract_json(text: str) -> Any:
    # find first JSON block
    m = re.search(r"```json\s*(.+?)\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        # try to find first { or [
        start = None
        for i, c in enumerate(text):
            if c in "[{":
                start = i
                break
        if start is not None:
            text = text[start:]
    try:
        return json.loads(text)
    except Exception:
        # attempt to fix trailing text
        try:
            end = max(text.rfind("]"), text.rfind("}"))
            return json.loads(text[: end + 1])
        except Exception:
            return None


async def _llm_json(system: str, prompt: str) -> Any:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"trade-agent-{uuid.uuid4()}",
        system_message=system,
    ).with_model("openai", "gpt-5.4")
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    return _extract_json(text), text


@api_router.post("/ai/recommendations")
async def ai_recommendations():
    """Analyze current portfolio & suggest safe exits, new buys, long-term picks."""
    portfolio = await list_holdings()
    holdings = portfolio["holdings"]

    holdings_snippet = "\n".join([
        f"- {h['symbol_display']} ({h['name']}): qty={h['quantity']}, buy=₹{h['buy_price']}, "
        f"current=₹{h['current_price']}, P/L={h['pnl_pct']}%, 52w H/L=₹{h['year_high']}/₹{h['year_low']}"
        for h in holdings
    ]) or "(empty portfolio)"

    system = (
        "You are a senior SEBI-registered equity research analyst specializing in the Indian stock market (NSE/BSE). "
        "You provide concise, actionable, data-driven recommendations. All prices in INR. "
        "You do NOT give financial advice guarantees; you provide analytical opinions. "
        "You are strict about JSON output — respond ONLY with valid JSON, no prose, no markdown fences."
    )

    prompt = f"""Analyze the following Indian equity portfolio and produce recommendations.

CURRENT PORTFOLIO:
{holdings_snippet}

Produce a JSON response with EXACTLY this shape:
{{
  "safe_exits": [
    {{"symbol":"TICKER","name":"Company","reason":"1-sentence why to exit","confidence":"High/Medium/Low","action":"Sell/Trim"}}
  ],
  "new_buys": [
    {{"symbol":"TICKER","name":"Company","sector":"Sector","reason":"1-sentence thesis","target_price_inr":1234,"confidence":"High/Medium/Low"}}
  ],
  "long_term_picks": [
    {{"symbol":"TICKER","name":"Company","sector":"Sector","reason":"why undervalued and long-term thesis","horizon_years":3,"confidence":"High/Medium/Low"}}
  ],
  "portfolio_health": {{
    "diversification":"1-sentence assessment",
    "risk_level":"Low/Moderate/High",
    "key_insight":"1 crisp insight"
  }}
}}

Guidelines:
- safe_exits: only holdings from portfolio that show weakness (negative P/L, sector headwinds, weak fundamentals).
- new_buys: 3-5 NSE-listed stocks (use plain tickers like RELIANCE, TCS, HDFCBANK, INFY, ITC, BAJFINANCE, LT, ASIANPAINT, MARUTI, TITAN, ADANIENT, SBIN, ICICIBANK, KOTAKBANK, WIPRO, HCLTECH, AXISBANK, ONGC, POWERGRID, NTPC, TATASTEEL, TATAMOTORS, SUNPHARMA, DRREDDY, BHARTIARTL, HINDUNILVR, NESTLEIND, DIVISLAB, TECHM, GRASIM, JSWSTEEL, HINDALCO, COALINDIA, ULTRACEMCO, BAJAJFINSV, EICHERMOT, HEROMOTOCO, BRITANNIA, CIPLA, INDUSINDBK) with current momentum.
- long_term_picks: 3-5 currently underperforming but fundamentally strong Indian stocks that could deliver strong returns over 3-5 years.
- Do NOT repeat a stock across safe_exits and new_buys.
- Return ONLY the JSON object, no extra text.
"""

    parsed, raw = await _llm_json(system, prompt)
    if not parsed:
        raise HTTPException(500, f"AI response could not be parsed: {raw[:300]}")

    # Enrich with live quotes for recommended tickers
    all_tickers = set()
    for k in ("safe_exits", "new_buys", "long_term_picks"):
        for it in parsed.get(k, []) or []:
            if it.get("symbol"):
                all_tickers.add(it["symbol"])

    quotes = await asyncio.gather(*[fetch_quote(normalize_symbol(t)) for t in all_tickers])
    qmap = {display_symbol(q["symbol"]): q for q in quotes}

    for k in ("safe_exits", "new_buys", "long_term_picks"):
        for it in parsed.get(k, []) or []:
            q = qmap.get(it.get("symbol", "").upper())
            if q:
                it["current_price"] = q["price"]
                it["change_pct"] = q["change_pct"]

    parsed["generated_at"] = datetime.now(timezone.utc).isoformat()
    await db.ai_recommendations.insert_one({**parsed, "id": str(uuid.uuid4())})
    parsed.pop("_id", None)
    return parsed


@api_router.get("/ai/recommendations/latest")
async def latest_recommendations():
    doc = await db.ai_recommendations.find_one({}, {"_id": 0}, sort=[("generated_at", -1)])
    return doc or {}


@api_router.post("/ai/analyze/{symbol}")
async def ai_analyze_stock(symbol: str):
    sym = normalize_symbol(symbol)
    q = await fetch_quote(sym)
    system = (
        "You are a senior Indian equity research analyst. Respond ONLY with valid JSON, no markdown."
    )
    prompt = f"""Analyze this NSE stock and return JSON only:

Stock: {display_symbol(sym)} ({q.get('name')})
Current Price: ₹{q.get('price')}
Day Change: {q.get('change_pct')}%
52w High/Low: ₹{q.get('year_high')} / ₹{q.get('year_low')}

Return JSON:
{{
  "verdict": "BUY/HOLD/SELL",
  "confidence": "High/Medium/Low",
  "short_term_view": "1-2 sentences",
  "long_term_view": "1-2 sentences",
  "key_risks": ["risk1","risk2"],
  "key_catalysts": ["catalyst1","catalyst2"],
  "fair_value_range_inr": "e.g. 1200-1400"
}}
"""
    parsed, raw = await _llm_json(system, prompt)
    if not parsed:
        raise HTTPException(500, f"AI parse failed: {raw[:200]}")
    return {"quote": q, "analysis": parsed}


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

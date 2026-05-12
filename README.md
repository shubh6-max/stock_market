# StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options

A React + Node.js trading assistant that combines **real market data**, **deterministic technical indicators**, **NSE option chain analytics**, and a **7-agent LLM pipeline** to generate intraday options trade plans on the NIFTY / BANKNIFTY 15-minute timeframe — and learns from your actual results.

Output adapts to the user — **Beginner** mode gives plain-English instructions ("buy this, exit if X happens"), **Pro** mode gives institutional bullets with greeks/IV reasoning.

---

## What's new in v2 (vs. "just an LLM vision project")

| Layer | What it does | Source |
|------|--------------|--------|
| **Market Data Service** | Live spot, 15-min OHLC, daily OHLC, India VIX, DXY, USD/INR, Brent, US 10y | Yahoo Finance (free, no key) |
| **Indicator Engine** | RSI(14), EMA(9/21/50), MACD, ATR(14), intraday VWAP, Opening Range, CPR (Pivot/BC/TC/R1-R3/S1-S3), Supertrend, trend label, nearest S/R | Pure code, deterministic |
| **Option Chain Analyzer** | PCR, Max Pain, top OI CE/PE strikes, ATM IV window | NSE (best-effort scrape) |
| **Vision Agent** | Reads chart pattern, structure (BOS/CHoCH), supply/demand, FVG, candle story | Azure gpt-4-vision |
| **Macro Agent** | Builds geopolitical brief grounded in REAL live numbers | Azure |
| **Options Agent** | Interprets option chain into directional signal | Azure |
| **Strategist + Risk Manager** | Combines all four above into a JSON trade plan honoring user's capital × risk% with explicit lot math | Azure |
| **Translator** | Beginner or Pro output (user picks) | Azure |

The LLM no longer hallucinates levels — it gets handed **computed numbers** and must reference them.

---

## Architecture

```
                          ┌─────────────────────────┐
                          │   Frontend (React/Vite) │
                          │  - LiveTicker (poll 30s)│
                          │  - Settings panel       │
                          │  - Capital / Risk / Mode│
                          │  - Chart upload         │
                          └────────────┬────────────┘
                                       │ SSE stream
                          ┌────────────▼────────────┐
                          │   Express server (5174) │
                          └────────────┬────────────┘
                                       │ orchestrates
        ┌──────────────────────────────┼────────────────────────────────┐
        │                              │                                │
┌───────▼─────────┐         ┌──────────▼──────────┐          ┌──────────▼─────────┐
│ Market Data     │         │ Indicator Engine    │          │ NSE Option Chain   │
│ (yahoo-finance2)│         │ (RSI/EMA/CPR/VWAP…) │          │ (axios + cookies)  │
└─────────────────┘         └─────────────────────┘          └────────────────────┘
        │                              │                                │
        └──────────────────────────────┼────────────────────────────────┘
                                       ▼
                       ┌─────────────────────────────────┐
                       │  Agents (Azure OpenAI):         │
                       │   1. Vision (pattern)           │
                       │   2. Macro (live numbers)       │
                       │   3. Options (PCR/MP/OI)        │
                       │   4. Strategist + Risk Manager  │
                       │   5. Translator (Beginner/Pro)  │
                       └─────────────────────────────────┘
```

---

## Setup

### 1. Backend

```powershell
cd backend
npm install
npm start    # listens on http://localhost:5174
```

`backend/.env` is pre-filled with your Azure OpenAI keys.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev  # listens on http://localhost:5173
```

Vite proxies `/api/*` → backend.

---

## Use it

1. Open http://localhost:5173 — top ticker auto-loads live NIFTY / BANKNIFTY / VIX / DXY / Brent / USDINR / US10Y.
2. Pick **NIFTY** or **BANKNIFTY**.
3. Pick **Beginner** or **Pro** mode.
4. Enter your **capital** (or click a chip: ₹1L / 3L / 5L / 10L / 25L).
5. Slide your **risk per trade** (0.25% – 2%). The card shows your max loss ₹ live.
6. Tick "Allow overnight" if you want positional.
7. Drag-drop a 15-min chart screenshot.
8. Click **Generate trade signal** — watch the 6 agents run live with timings.
9. The result card shows:
   - **Beginner mode**: headline, what-to-buy, ⛔ stop-loss, 🎯 target, RR, why, what-can-go-wrong, broker-app step-by-step
   - **Pro mode**: contract, lot math, RR, SMC confluence, flow confluence, macro confluence, greeks note, invalidation, scale-out plan

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Sanity |
| GET | `/api/market` | Live snapshot (Yahoo Finance) for ticker |
| GET | `/api/indicators?instrument=NIFTY` | Deterministic indicators only (no LLM) |
| POST | `/api/analyze` | SSE stream — runs full pipeline |

---

## Risk math (enforced by strategist)

```
risk_inr = capital × (risk_pct / 100)
SL_distance_on_option_premium × lot_size × lots ≤ risk_inr
NIFTY lot = 75    |    BANKNIFTY lot = 30
Lots ∈ [4, 12]    |    RR ≥ 1:1.5
```

If math says lots < 4 → strategist tightens SL. If lots > 12 → it widens SL. Either way, your configured risk is the floor and ceiling.

---

## Free data sources used

- **Yahoo Finance** (via `yahoo-finance2`) — spot, OHLC, indices, FX, commodities
- **NSE India option chain endpoint** — `nseindia.com/api/option-chain-indices` with cookie warm-up
- **Azure OpenAI** — gpt-4-vision-preview (your provided keys)

Zero paid data subscriptions.

---

## Caveats

- NSE option chain is rate-limited and blocks foreign IPs / data-center IPs occasionally. The system degrades gracefully — the strategist proceeds without it and the Options Agent says so.
- Yahoo's 15-min candles for `^NSEI` / `^NSEBANK` are usually 15-min delayed during Indian market hours. For exact same-tick pricing you'd plug in a paid feed (Kite Connect, TrueData) — code is structured so swap is a one-file change.
- This is **educational software**. Always verify on your broker terminal before placing real orders.

# StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options

StrikePilot is an educational AI-assisted decision workspace for **NIFTY** and **BANKNIFTY** options traders. It combines live market context, deterministic technical indicators, NSE option-chain analytics, chart-image interpretation, strict risk sizing, journaling, and performance learning into one workflow.

The product helps a trader move through the full loop:

```text
Analyze chart → Generate risk-sized plan → Save recommendation → Record actual result → Learn from performance
```

> **Important:** StrikePilot is educational decision-support software. It does not provide guaranteed trading signals, financial advice, or automatic order placement. Always verify levels, option premium, liquidity, and risk on your broker terminal before placing any real trade.

---

## Documentation

| Document | Purpose |
|---|---|
| [PRD.md](./PRD.md) | Product requirements, target users, business scope, roadmap, risks |
| [TRD.md](./TRD.md) | Technical requirements, architecture, services, security, production checklist |
| [APP_FLOW.md](./APP_FLOW.md) | User journey, Analyzer flow, Journal flow, Performance flow, SSE event flow |
| [UI_UX_BRIEF.md](./UI_UX_BRIEF.md) | UI/UX direction, screen structure, states, copy guidelines, visual principles |
| [BACKEND_SCHEMA.md](./BACKEND_SCHEMA.md) | Current JSON schema, API payloads, future SQL schema |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Step-by-step roadmap for improving and productionizing the app |

---

## Current Product Scope

StrikePilot currently supports:

- Live market snapshot for NIFTY, BANKNIFTY, India VIX, USD/INR, DXY, Brent crude, and US 10Y.
- 15-minute and daily candle retrieval through Yahoo Finance.
- Deterministic indicator calculation.
- NSE option-chain best-effort analysis.
- Upload of NIFTY and/or BANKNIFTY chart screenshots.
- Multi-agent Azure OpenAI analysis pipeline.
- Server-Sent Events streaming from backend to frontend.
- Trade/no-trade recommendation output.
- Beginner and advanced explanation modes.
- Saved recommendation journal.
- Editable actual trade execution fields.
- PnL tracking.
- Setup performance and confidence calibration.

---

## Core Modules

| Layer | What it does | Source / Implementation |
|---|---|---|
| Market Data Service | Live spot, 15-min OHLC, daily OHLC, India VIX, DXY, USD/INR, Brent, US 10Y | `yahoo-finance2` |
| Indicator Engine | RSI, EMA, MACD, ATR, VWAP, Opening Range, CPR, Supertrend, nearest S/R | Pure deterministic code |
| Option Chain Analyzer | PCR, Max Pain, top CE/PE OI strikes, ATM option window | NSE best-effort scrape |
| Vision Agent | Reads uploaded chart image structure and candle behavior | Azure OpenAI vision-capable model |
| Macro Agent | Interprets volatility, currency, crude, and yield context | Azure OpenAI |
| Options Agent | Interprets option-chain summary | Azure OpenAI |
| Strategist Agent | Combines chart, indicators, options, macro, and risk math | Azure OpenAI |
| Confidence + Learning | Scores and adjusts confidence using stored outcomes | Backend services |
| Journal | Stores recommendation and actual result data | Local JSON file store |
| Performance | Calculates win rate, expectancy, setup performance, calibration | Backend analytics |

---

## Architecture

```text
Frontend: React + Vite
  |
  | REST + Server-Sent Events
  v
Backend: Express + Node.js
  |
  |-- Yahoo Finance market data
  |-- NSE option-chain service
  |-- Deterministic indicator engine
  |-- Azure OpenAI agent pipeline
  |-- Journal service
  |-- Performance service
  v
Local JSON Store: backend/data/strikepilot.json
```

---

## Repository Structure

```text
.
├── README.md
├── PRD.md
├── TRD.md
├── APP_FLOW.md
├── UI_UX_BRIEF.md
├── BACKEND_SCHEMA.md
├── IMPLEMENTATION_PLAN.md
├── backend/
│   ├── server.js
│   ├── azureClient.js
│   ├── agents/
│   ├── services/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   └── components/
    └── package.json
```

---

## Setup

### 1. Backend

```powershell
cd backend
npm install
npm start
```

Backend runs on:

```text
http://localhost:5174
```

Required backend environment variables:

```text
AZURE_ENDPOINT
AZURE_DEPLOYMENT
AZURE_API_KEY
AZURE_API_VERSION
PORT
```

`PORT` is optional and defaults to `5174`.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Vite proxies `/api/*` requests to the backend.

---

## How to Use

1. Open the frontend at `http://localhost:5173`.
2. Review the live ticker and market snapshot.
3. Go to **Analyzer**.
4. Enter capital.
5. Select risk percentage.
6. Choose Beginner or Advanced mode.
7. Choose whether overnight is allowed.
8. Upload a 15-minute NIFTY chart, BANKNIFTY chart, or both.
9. Click **Generate trade brief**.
10. Watch the agent pipeline stream progress.
11. Review trade or no-trade output.
12. Open **Journal** to enter actual trade result.
13. Open **Performance** to review win rate, setup performance, confidence calibration, and PnL.

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/market` | Live market snapshot |
| GET | `/api/indicators?instrument=NIFTY` | Deterministic indicator output |
| GET | `/api/diagnostics` | Data-source and Azure env diagnostics |
| POST | `/api/analyze` | SSE stream for full AI analysis pipeline |
| GET | `/api/journal` | List saved recommendations |
| GET | `/api/journal/:id` | Get one recommendation |
| POST | `/api/journal/:id/result` | Record result for a recommendation |
| PATCH | `/api/journal/:id` | Patch actual execution/outcome fields |
| DELETE | `/api/journal/:id` | Delete recommendation |
| GET | `/api/performance` | Performance analytics |

More detail is available in [BACKEND_SCHEMA.md](./BACKEND_SCHEMA.md).

---

## Risk Math

The strategist uses the user's capital and risk percentage:

```text
risk_inr = capital × (risk_pct / 100)
SL_distance_on_option_premium × lot_size × lots ≤ risk_inr
NIFTY lot size = 75
BANKNIFTY lot size = 30
Preferred lots range = 4 to 12
Preferred RR = at least 1:1.5
```

If risk sizing or chart clarity is not acceptable, the system should return `NO_TRADE` instead of forcing a trade.

---

## Data Sources

| Source | Usage |
|---|---|
| Yahoo Finance | Spot, OHLC, indices, FX, commodities, yields |
| NSE India option-chain endpoint | PCR, max pain, OI, ATM window |
| Azure OpenAI | Chart vision, macro interpretation, option-chain interpretation, strategist, explanation |

---

## Caveats

- NSE option-chain access may fail due to rate limits, anti-bot checks, regional blocks, or data-center IP restrictions.
- Yahoo Finance 15-minute candles for Indian indices may be delayed during market hours.
- The current database is a local JSON file and should be replaced with a real database before production.
- There is no authentication or multi-user isolation yet.
- This app is educational software and should not be treated as a licensed financial advisor or guaranteed signal engine.

---

## Recommended Next Changes

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full roadmap.

Immediate next best commits:

1. Add `.env.example`.
2. Add backend environment validation.
3. Add visible educational disclaimer in Analyzer output.
4. Add unit tests for indicators and PnL calculation.
5. Move persistence from local JSON file to database.

---

## License / Disclaimer

This repository is for educational and experimental software development. Trading options involves significant risk. StrikePilot does not place trades, does not guarantee profit, and does not replace independent judgment or professional financial advice.

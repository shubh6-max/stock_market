# Technical Requirements Document (TRD)

## Product

**StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options**

## Purpose

This document defines the technical requirements for building, maintaining, and scaling StrikePilot. It is intended for developers, Codex, contributors, and future implementation planning.

---

## 1. System Overview

StrikePilot is a full-stack web app with:

- React/Vite frontend
- Express/Node.js backend
- Yahoo Finance market data integration
- NSE option-chain best-effort integration
- Deterministic technical indicator engine
- Azure OpenAI multi-agent analysis pipeline
- JSON-file persistence for current prototype
- Trade journal and performance analytics

The system produces educational trade analysis only. It must not place trades automatically or guarantee outcomes.

---

## 2. High-Level Architecture

```text
User Browser
  |
  | React/Vite Frontend
  | - Live ticker
  | - Analyzer workspace
  | - Journal
  | - Performance dashboard
  |
  | REST + SSE
  v
Express Backend
  |
  |-- Market Data Service
  |-- Indicator Engine
  |-- NSE Option Chain Service
  |-- Azure OpenAI Agents
  |-- Journal Service
  |-- Performance Service
  |
  v
Local JSON Store
```

---

## 3. Frontend Technical Requirements

### 3.1 Framework

- Use React 18.
- Use Vite for development and build.
- Keep the frontend as a single-page app.
- Proxy `/api/*` requests to backend during local development.

### 3.2 Main Pages

The frontend must support these core pages:

1. **Analyzer**
   - Upload NIFTY chart.
   - Upload BANKNIFTY chart.
   - Configure capital.
   - Configure risk percentage.
   - Choose beginner/advanced output.
   - Choose overnight allowed/not allowed.
   - Stream agent progress.
   - Show trade or no-trade output.

2. **Journal**
   - List generated recommendations.
   - Filter by instrument.
   - Edit actual lots, entry, exit, outcome, notes, and mistake reason.
   - Delete records.

3. **Performance**
   - Show overall KPIs.
   - Show setup performance.
   - Show confidence calibration.
   - Show daily PnL.

### 3.3 Streaming Requirement

The Analyzer must consume Server-Sent Events from `/api/analyze`.

Expected event types:

```text
status
market
vision
macro
options
strategist
confidence
explanation
persisted
done
error
```

The UI must update progressively as events arrive.

---

## 4. Backend Technical Requirements

### 4.1 Runtime

- Node.js runtime.
- Express server.
- ES modules.
- Environment variables loaded through `dotenv`.

### 4.2 Required Environment Variables

```text
AZURE_ENDPOINT
AZURE_DEPLOYMENT
AZURE_API_KEY
AZURE_API_VERSION
PORT
```

`PORT` should default to `5174` when not provided.

### 4.3 Backend Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/market` | Live market snapshot |
| GET | `/api/indicators?instrument=NIFTY` | Deterministic indicator response |
| GET | `/api/diagnostics` | Data source and env checks |
| POST | `/api/analyze` | Main SSE analysis pipeline |
| GET | `/api/journal` | List saved recommendations |
| GET | `/api/journal/:id` | Get one recommendation |
| POST | `/api/journal/:id/result` | Record trade result |
| PATCH | `/api/journal/:id` | Patch actual execution/result data |
| DELETE | `/api/journal/:id` | Delete recommendation |
| GET | `/api/performance` | Return performance analytics |

---

## 5. Data Source Requirements

### 5.1 Yahoo Finance

Used for:

- NIFTY spot
- BANKNIFTY spot
- India VIX
- USD/INR
- DXY
- Brent crude
- US 10Y yield
- 15-minute candles
- Daily candles

Requirements:

- Handle empty candle response.
- Handle quote errors without crashing app.
- Return error field when specific symbol fetch fails.

### 5.2 NSE Option Chain

Used for:

- PCR
- Max pain
- CE/PE OI levels
- ATM window
- IV data where available

Requirements:

- Use browser-like headers.
- Warm cookies before API call.
- Degrade gracefully when blocked/rate-limited.
- Never block full analysis only because option-chain is unavailable.

---

## 6. Indicator Engine Requirements

Indicators must be deterministic and independent of LLM output.

Required calculations:

- SMA
- EMA
- RSI
- ATR
- MACD
- VWAP
- Opening range
- CPR
- Supertrend
- Trend label
- Nearest support/resistance

Missing values should return `null`, not invented approximations.

---

## 7. AI Agent Requirements

### 7.1 Azure OpenAI Client

The backend must call Azure OpenAI chat-completions endpoint using:

```text
{AZURE_ENDPOINT}/openai/deployments/{AZURE_DEPLOYMENT}/chat/completions?api-version={AZURE_API_VERSION}
```

### 7.2 Image Support

The analysis endpoint must pass uploaded chart images as base64 data URLs to the vision-capable Azure model.

### 7.3 Agent Responsibilities

| Agent | Responsibility |
|---|---|
| Vision Agent | Read chart structure and candle behavior |
| Macro Agent | Summarize market/macro context |
| Options Agent | Interpret option-chain summary |
| Strategist Agent | Produce trade/no-trade JSON with risk math |
| Confidence Agent | Score confidence using structured inputs |
| Explanation Agent | Translate output for beginner/advanced mode |
| Learning Layer | Adjust confidence using historical outcomes |

### 7.4 JSON Output Requirement

The Strategist Agent must return parseable JSON.

Minimum result fields:

```json
{
  "decision": "TAKE_TRADE | NO_TRADE",
  "instrument": "NIFTY | BANKNIFTY | null",
  "bias": "BULLISH | BEARISH | SIDEWAYS",
  "setup_type": "string",
  "option_type": "CE | PE | null",
  "strike": 0,
  "contract": "string",
  "entry_low": 0,
  "entry_high": 0,
  "stop_loss": 0,
  "target_1": 0,
  "target_2": 0,
  "rr_ratio": 0,
  "lots": 0,
  "risk_inr": 0,
  "reward_inr": 0,
  "raw_confidence_pct": 0,
  "invalid_condition": "string"
}
```

---

## 8. Risk Sizing Requirements

Risk must be calculated as:

```text
risk_inr = capital × (risk_pct / 100)
```

Lot size rules:

```text
NIFTY lot size = 75
BANKNIFTY lot size = 30
```

The system should prefer:

- Lots between 4 and 12.
- Risk-reward ratio of at least 1:1.5.
- No trade when risk sizing cannot fit the user's risk budget.

---

## 9. Persistence Requirements

Current prototype uses a local JSON file store.

Current collections:

```text
recommendations
results
```

Requirements:

- Writes must be atomic.
- Recommendation records must be preserved after analysis.
- Result records must be upserted.
- Deleting a recommendation must also delete associated result data.

Future production requirement:

- Replace local JSON storage with PostgreSQL, Supabase, or SQLite.
- Add user-level data isolation.

---

## 10. Error Handling Requirements

The app must handle:

- Missing uploaded chart.
- Invalid Azure response.
- JSON parse failure.
- Yahoo data failure.
- NSE option-chain failure.
- Azure content filter failure.
- Azure timeout failure.
- Frontend streaming failure.

Errors should be user-readable and should not crash the full app.

---

## 11. Security Requirements

- Do not commit real API keys.
- Add `.env.example` for required variables.
- Keep Azure keys server-side only.
- Do not expose backend secrets in frontend code.
- For production, add authentication and per-user data authorization.

---

## 12. Compliance Requirements

- Clearly state that StrikePilot is educational software.
- Do not claim guaranteed returns.
- Do not auto-place trades.
- Require the user to verify all levels and prices before any real trade.
- Review financial-advice compliance before public release.

---

## 13. Production Readiness Checklist

- [ ] Add `.env.example`.
- [ ] Add startup env validation.
- [ ] Move data store from JSON file to database.
- [ ] Add authentication.
- [ ] Add user-specific journal data.
- [ ] Add input validation for API routes.
- [ ] Add structured logs.
- [ ] Add tests for indicator engine.
- [ ] Add tests for risk sizing.
- [ ] Add graceful UI error handling.
- [ ] Add deployment docs.

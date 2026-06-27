# Backend Schema

## Product

**StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options**

## Purpose

This document defines the current backend data model, API payloads, persisted entities, and future database schema direction for StrikePilot.

---

## 1. Current Persistence Model

The current prototype uses a local JSON-file store.

File location:

```text
backend/data/strikepilot.json
```

Top-level structure:

```json
{
  "recommendations": [],
  "results": []
}
```

Current implementation:

- `recommendations` stores AI-generated trade/no-trade plans.
- `results` stores actual user execution and outcome data.
- Backend joins both collections by recommendation ID.
- Writes are flushed to disk after every insert/update/delete.

---

## 2. Collection: recommendations

### 2.1 Purpose

Stores each AI-generated recommendation from the Analyzer pipeline.

A recommendation may be:

- `TAKE_TRADE`
- `NO_TRADE`

### 2.2 Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique recommendation ID |
| `created_at` | string | ISO timestamp |
| `instrument` | string | `NIFTY` or `BANKNIFTY` |
| `spot_at_entry` | number/null | Spot price at recommendation time |
| `decision` | string | `TAKE_TRADE` or `NO_TRADE` |
| `setup_type` | string/null | Setup classification |
| `option_type` | string/null | `CE`, `PE`, or null |
| `strike` | number/null | Selected strike |
| `contract` | string/null | Human-readable contract |
| `entry_low` | number/null | Lower entry premium |
| `entry_high` | number/null | Upper entry premium |
| `stop_loss` | number/null | Option premium stop-loss |
| `target_1` | number/null | First target premium |
| `target_2` | number/null | Second target premium |
| `underlying_sl` | number/null | Underlying invalidation/SL level |
| `underlying_t1` | number/null | Underlying target 1 |
| `underlying_t2` | number/null | Underlying target 2 |
| `rr_ratio` | number/null | Risk-reward ratio |
| `lots` | number/null | Recommended lots |
| `lot_size` | number/null | Instrument lot size |
| `risk_inr` | number/null | Expected max risk |
| `reward_inr` | number/null | Expected reward |
| `confidence_raw` | number/null | Raw confidence score |
| `confidence_adj` | number/null | Learning-adjusted confidence |
| `confidence_label` | string/null | Confidence label |
| `invalid_condition` | string/null | Invalidation condition |
| `capital` | number/null | User capital input |
| `risk_pct` | number/null | User risk percentage input |
| `mode` | string/null | Beginner/Advanced mode |
| `market_context` | object/null | Snapshot + indicators |
| `chart_analysis` | object/null | Vision analysis output |
| `strategist_json` | object/string/null | Parsed strategist output |
| `explanation` | string/null | Final explanation payload |
| `raw_strategist` | string/null | Raw strategist response |

---

## 3. Collection: results

### 3.1 Purpose

Stores user-recorded actual execution and outcome data for a recommendation.

### 3.2 Fields

| Field | Type | Description |
|---|---|---|
| `rec_id` | string | Foreign key to recommendation ID |
| `updated_at` | string | ISO update timestamp |
| `outcome` | string/null | Result status |
| `exit_price` | number/null | Legacy/optional exit price |
| `pnl_inr` | number/null | Realized PnL |
| `mistake_reason` | string/null | User-entered mistake reason |
| `user_note` | string/null | Free-form user notes |
| `actual_lots` | number/null | Actual lots traded |
| `actual_entry` | number/null | Actual entry premium |
| `actual_exit` | number/null | Actual exit premium |

### 3.3 Supported Outcomes

```text
OPEN
TARGET1_HIT
TARGET2_HIT
SL_HIT
MANUAL_EXIT
SKIPPED
```

### 3.4 Auto PnL Calculation

When these values exist:

- `actual_lots`
- `actual_entry`
- `actual_exit`
- `lot_size`

PnL can be calculated as:

```text
pnl_inr = (actual_exit - actual_entry) × lot_size × actual_lots
```

---

## 4. API Schemas

## 4.1 GET /api/health

### Response

```json
{
  "ok": true,
  "deployment": "azure-deployment-name"
}
```

---

## 4.2 GET /api/market

### Response

```json
{
  "nifty": {
    "symbol": "^NSEI",
    "price": 0,
    "change": 0,
    "changePct": 0,
    "dayHigh": 0,
    "dayLow": 0,
    "prevClose": 0,
    "open": 0,
    "time": "timestamp"
  },
  "banknifty": {},
  "indiavix": {},
  "usdinr": {},
  "dxy": {},
  "crude": {},
  "us10y": {},
  "timestamp": "ISO timestamp"
}
```

If a symbol fetch fails:

```json
{
  "symbol": "^NSEI",
  "error": "message"
}
```

---

## 4.3 GET /api/indicators

### Query Parameters

| Name | Required | Description |
|---|---|---|
| `instrument` | No | Defaults to `NIFTY` |

### Response

```json
{
  "instrument": "NIFTY",
  "candles15m_count": 0,
  "indicators": {
    "last_price": 0,
    "last_candle_time": "timestamp",
    "rsi_14": 0,
    "ema_9": 0,
    "ema_21": 0,
    "ema_50": 0,
    "macd": {
      "macd": 0,
      "signal": 0,
      "hist": 0
    },
    "atr_14": 0,
    "vwap": 0,
    "opening_range": {
      "high": 0,
      "low": 0
    },
    "cpr": {
      "pivot": 0,
      "bc": 0,
      "tc": 0,
      "r1": 0,
      "r2": 0,
      "r3": 0,
      "s1": 0,
      "s2": 0,
      "s3": 0,
      "width": 0
    },
    "supertrend": {
      "trend": "UP | DOWN | NEUTRAL",
      "upper": 0,
      "lower": 0
    },
    "trend_label": "STRONG_UP | STRONG_DOWN | WEAK_UP | WEAK_DOWN | UNKNOWN",
    "above_vwap": true,
    "price_vs_pivot": "ABOVE_CPR | BELOW_CPR | INSIDE_CPR",
    "nearest_resistance": {
      "name": "R1",
      "level": 0,
      "distance": 0
    },
    "nearest_support": {
      "name": "S1",
      "level": 0,
      "distance": 0
    }
  }
}
```

---

## 4.4 GET /api/diagnostics

### Response

```json
{
  "timestamp": "ISO timestamp",
  "checks": {
    "yahoo_spot": {
      "ok": true,
      "nifty": 0,
      "banknifty": 0,
      "indiavix": 0,
      "error": null
    },
    "yahoo_candles_15m": {
      "ok": true,
      "count": 0
    },
    "yahoo_candles_daily": {
      "ok": true,
      "count": 0
    },
    "nse_option_chain": {
      "ok": true,
      "pcr": 0,
      "max_pain": 0,
      "error": null
    },
    "azure_env": {
      "ok": true,
      "deployment": "deployment-name"
    }
  },
  "summary": "string"
}
```

---

## 4.5 POST /api/analyze

### Request Content Type

```text
multipart/form-data
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `chart_nifty` | file | No | NIFTY chart screenshot |
| `chart_banknifty` | file | No | BANKNIFTY chart screenshot |
| `capital` | number | No | User capital |
| `riskPct` | number | No | Risk percentage |
| `mode` | string | No | Beginner/Advanced |
| `overnight` | boolean/string | No | Whether overnight is allowed |

At least one chart file is required.

### Response

Server-Sent Events stream.

### SSE Events

| Event | Payload |
|---|---|
| `status` | Current pipeline status |
| `market` | Market snapshot, indicators, option-chain summary, data quality |
| `vision` | Chart analysis result |
| `macro` | Macro brief |
| `options` | Option-chain interpretation |
| `strategist` | Trade/no-trade JSON |
| `confidence` | Confidence score and adjustment |
| `explanation` | Final user-facing explanation |
| `persisted` | Saved recommendation ID |
| `done` | Completion status |
| `error` | Error message |

---

## 4.6 GET /api/journal

### Query Parameters

| Name | Required | Description |
|---|---|---|
| `limit` | No | Max rows, capped at 200 |
| `offset` | No | Pagination offset |
| `instrument` | No | Filter by `NIFTY` or `BANKNIFTY` |

### Response

```json
{
  "total": 0,
  "items": []
}
```

Items contain recommendation fields joined with result fields.

---

## 4.7 PATCH /api/journal/:id

### Request Body

```json
{
  "outcome": "OPEN",
  "actual_lots": 4,
  "actual_entry": 120,
  "actual_exit": 150,
  "pnl_inr": null,
  "mistake_reason": "Entered late",
  "user_note": "Waited for retest"
}
```

### Response

```json
{
  "ok": true
}
```

---

## 4.8 GET /api/performance

### Response

```json
{
  "overall": {
    "total_recommendations": 0,
    "trades_taken": 0,
    "no_trades": 0,
    "trades_closed": 0,
    "wins": 0,
    "losses": 0,
    "win_rate": null,
    "total_pnl_inr": 0,
    "avg_win_inr": 0,
    "avg_loss_inr": 0,
    "expectancy_inr": null
  },
  "setups": [],
  "confidence_calibration": [],
  "daily_pnl": [],
  "insights": {}
}
```

---

## 5. Future Production Database Schema

Recommended relational model:

### 5.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 recommendations

```sql
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL,
  instrument TEXT NOT NULL,
  spot_at_entry NUMERIC,
  decision TEXT NOT NULL,
  setup_type TEXT,
  option_type TEXT,
  strike NUMERIC,
  contract TEXT,
  entry_low NUMERIC,
  entry_high NUMERIC,
  stop_loss NUMERIC,
  target_1 NUMERIC,
  target_2 NUMERIC,
  underlying_sl NUMERIC,
  underlying_t1 NUMERIC,
  underlying_t2 NUMERIC,
  rr_ratio NUMERIC,
  lots NUMERIC,
  lot_size NUMERIC,
  risk_inr NUMERIC,
  reward_inr NUMERIC,
  confidence_raw NUMERIC,
  confidence_adj NUMERIC,
  confidence_label TEXT,
  invalid_condition TEXT,
  capital NUMERIC,
  risk_pct NUMERIC,
  mode TEXT,
  market_context JSONB,
  chart_analysis JSONB,
  strategist_json JSONB,
  explanation JSONB,
  raw_strategist TEXT
);
```

### 5.3 trade_results

```sql
CREATE TABLE trade_results (
  rec_id TEXT PRIMARY KEY REFERENCES recommendations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL,
  outcome TEXT,
  exit_price NUMERIC,
  pnl_inr NUMERIC,
  mistake_reason TEXT,
  user_note TEXT,
  actual_lots NUMERIC,
  actual_entry NUMERIC,
  actual_exit NUMERIC
);
```

### 5.4 Indexes

```sql
CREATE INDEX idx_recommendations_user_created
ON recommendations(user_id, created_at DESC);

CREATE INDEX idx_recommendations_instrument
ON recommendations(instrument);

CREATE INDEX idx_recommendations_setup
ON recommendations(setup_type);

CREATE INDEX idx_trade_results_outcome
ON trade_results(outcome);
```

---

## 6. Schema Migration Notes

When moving from JSON store to database:

1. Preserve existing recommendation IDs.
2. Parse stringified JSON fields into JSONB where possible.
3. Add user ownership before production.
4. Keep local JSON export/import for backup.
5. Write migration script from `backend/data/strikepilot.json` to DB.

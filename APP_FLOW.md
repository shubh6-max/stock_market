# App Flow

## Product

**StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options**

## Purpose

This document explains how users move through the StrikePilot app and how data flows between frontend, backend, external data services, AI agents, journal, and performance analytics.

---

## 1. Main Navigation

StrikePilot has three primary workspaces:

1. **Analyzer**
   - Main decision workspace.
   - User uploads chart screenshots and generates trade/no-trade analysis.

2. **Journal**
   - Execution tracking workspace.
   - User reviews saved recommendations and records actual trade results.

3. **Performance**
   - Learning workspace.
   - User reviews outcomes, setup quality, confidence calibration, and PnL.

---

## 2. App Startup Flow

```text
User opens app
  ↓
Frontend loads React app
  ↓
Frontend calls GET /api/market
  ↓
Backend fetches market snapshot from Yahoo Finance
  ↓
Frontend displays ticker and dashboard cards
  ↓
Frontend polls market data every 30 seconds
```

Visible startup elements:

- Live ticker
- NIFTY price
- BANKNIFTY price
- India VIX
- Macro pulse
- Workspace tabs

---

## 3. Analyzer User Flow

### 3.1 User Inputs

User configures:

- Capital
- Risk percentage
- Output mode
- Overnight allowed/not allowed
- NIFTY chart screenshot
- BANKNIFTY chart screenshot

At least one chart is required.

### 3.2 Analyzer Flow Diagram

```text
User opens Analyzer
  ↓
Set capital and risk controls
  ↓
Choose Beginner or Advanced mode
  ↓
Upload NIFTY chart and/or BANKNIFTY chart
  ↓
Click Generate trade brief
  ↓
Frontend sends multipart POST /api/analyze
  ↓
Backend starts SSE stream
  ↓
Frontend updates pipeline timeline as events arrive
  ↓
System returns trade recommendation or no-trade result
  ↓
Recommendation is saved to journal
```

---

## 4. Backend Analysis Flow

### 4.1 Request Intake

Endpoint:

```text
POST /api/analyze
```

Input:

- `chart_nifty` file, optional
- `chart_banknifty` file, optional
- `capital`
- `riskPct`
- `mode`
- `overnight`

Validation:

- Reject request if no chart is uploaded.
- Clamp risk percentage to a safe supported range.
- Default capital if not provided.

### 4.2 Processing Flow

```text
Receive analyze request
  ↓
Open SSE connection
  ↓
Fetch market snapshot
  ↓
For each uploaded instrument:
    - Fetch 15-min candles
    - Fetch daily candles
    - Fetch option chain
    - Compute indicators
    - Convert chart image to base64 data URL
    - Assess data quality
  ↓
Send market event to frontend
  ↓
Run independent agents in parallel:
    - Vision agent per chart
    - Macro agent
    - Options agent per chart
  ↓
Send vision, macro, and options events
  ↓
Run strategist agent
  ↓
Send strategist event
  ↓
Run confidence scoring and learning adjustment
  ↓
Send confidence event
  ↓
Run explanation agent
  ↓
Send explanation event
  ↓
Persist recommendation
  ↓
Send persisted and done events
```

---

## 5. SSE Event Flow

The backend sends the following event sequence:

```text
status: data
market
status: vision
status: macro
status: options
vision
macro
options
status: strategist
strategist
status: confidence
confidence
status: explanation
explanation
persisted
done
```

If anything fails:

```text
error
```

The frontend must keep the user informed at every stage.

---

## 6. Trade Result Flow

### 6.1 Trade Recommendation Output

If the setup is valid, the app shows:

- Instrument
- Contract
- Bias
- Setup type
- Entry range
- Stop-loss
- Targets
- Risk-reward
- Lots
- Risk amount
- Confidence
- Reasoning
- Invalidation condition

### 6.2 No-Trade Output

If the setup is not valid, the app shows:

- No-trade decision
- Reason
- What would need to change
- Risk warning

No-trade records are still useful because they show capital protected and can be included in performance review.

---

## 7. Journal Flow

```text
User opens Journal
  ↓
Frontend calls GET /api/journal
  ↓
Backend returns saved recommendations joined with result data
  ↓
User filters by ALL / NIFTY / BANKNIFTY
  ↓
User edits actual lots, entry, exit, outcome, notes
  ↓
Frontend sends PATCH /api/journal/:id
  ↓
Backend upserts result row
  ↓
If actual lots + entry + exit are available, backend computes PnL
  ↓
Frontend reloads journal
```

Journal supports:

- Inline editable fields
- Outcome dropdown
- Mistake reason
- User notes
- Recommendation detail expansion
- Delete recommendation

---

## 8. Performance Flow

```text
User opens Performance
  ↓
Frontend calls GET /api/performance
  ↓
Backend joins recommendations + results
  ↓
Backend calculates metrics
  ↓
Frontend renders performance dashboard
```

Metrics shown:

- Total recommendations
- Trades taken
- No-trades
- Closed trades
- Win rate
- Total PnL
- Average win
- Average loss
- Expectancy
- Setup performance
- Confidence calibration
- Daily PnL
- Learning tips

---

## 9. Data Quality Flow

Data quality is assessed for each instrument using:

- Spot availability
- 15-minute candle count
- Daily candle count
- VWAP availability
- RSI availability
- EMA availability
- CPR availability
- ATR availability
- Supertrend availability
- Option-chain availability

Quality bands:

```text
good
partial
poor
```

Important rule:

- Missing numeric data should reduce confidence or context quality.
- Missing numeric data should not automatically stop chart-based analysis.

---

## 10. Learning Loop Flow

```text
AI recommends trade/no-trade
  ↓
User records actual result
  ↓
Performance module aggregates outcomes
  ↓
Learning layer identifies setup patterns
  ↓
Confidence adjustment uses historical data
  ↓
Future recommendations become better calibrated
```

The product value increases as the user records more actual results.

---

## 11. Error Flow

Common error states:

| Error | Expected UX |
|---|---|
| No chart uploaded | Disable analyze button or show validation message |
| Yahoo data unavailable | Continue with chart and show data-quality warning |
| NSE option chain blocked | Continue without option-chain confluence |
| Azure error | Show readable error message |
| JSON parse failure | Show analysis failed and ask user to retry |
| Streaming unsupported | Show browser compatibility error |

---

## 12. Future Flow Enhancements

Recommended future flows:

1. **Authentication flow**
   - Login
   - User-specific journal
   - User-specific performance

2. **Broker import flow**
   - Connect broker
   - Import actual trades
   - Match trades to recommendations

3. **Backtest/replay flow**
   - Upload old chart
   - Replay analysis
   - Compare with real outcome

4. **Export flow**
   - Export journal to CSV
   - Export trade report to PDF

5. **Setup alert flow**
   - User defines setup type
   - System watches market context
   - User gets alert when conditions match

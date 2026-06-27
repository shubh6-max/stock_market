# Product Requirements Document (PRD)

## Product Name

**StrikePilot**

## Repository

`shubh6-max/stock_market`

## Version

PRD v1.0

## Last Updated

2026-06-28

---

## 1. Product Summary

StrikePilot is an AI-assisted intraday options decision workspace for Indian index-option traders focused on **NIFTY** and **BANKNIFTY**. The product combines live market context, deterministic technical indicators, NSE option-chain analytics, chart-image interpretation, strict risk sizing, recommendation journaling, and performance learning into one workflow.

The product is designed as an educational trading assistant. It does not place trades or guarantee outcomes. Its role is to help users structure their thinking, size risk, document execution, and learn from results.

---

## 2. Problem Statement

Retail options traders often struggle with four major problems:

1. **Market context is fragmented**  
   Traders need to check index levels, India VIX, global macro indicators, option-chain data, and chart structure across many tools.

2. **Trade decisions are emotional and inconsistent**  
   Many traders enter trades without a clear setup, stop-loss, target, invalidation level, or risk budget.

3. **Risk sizing is often ignored**  
   Beginners especially may decide entry first and risk later, which leads to overexposure.

4. **Learning loop is weak**  
   Traders rarely compare AI/strategy recommendations against actual execution and outcomes in a structured way.

---

## 3. Product Vision

StrikePilot should become a practical decision desk for NIFTY/BANKNIFTY options traders where the user can:

- Upload one or two 15-minute chart screenshots.
- Get live market and macro context.
- Receive a structured trade or no-trade decision.
- Understand the reason behind the recommendation.
- See risk-adjusted lot sizing based on capital and risk percentage.
- Save the recommendation automatically.
- Record actual trade execution.
- Review performance and improve over time.

---

## 4. Target Users

### 4.1 Beginner Options Traders

Users who understand basic options trading but need guided, plain-English trade planning.

Needs:

- Simple explanation.
- Clear buy/avoid decision.
- Stop-loss and target guidance.
- Risk visibility.
- Educational reasoning.

### 4.2 Active Intraday Traders

Users who trade NIFTY/BANKNIFTY intraday and want structured confluence across chart, indicators, option-chain, and macro data.

Needs:

- Fast analysis.
- Setup classification.
- Option-chain context.
- Risk-reward validation.
- Journal and performance tracking.

### 4.3 Self-Improvement Focused Traders

Users who want to understand which setups work best for them over time.

Needs:

- Trade history.
- Actual entry/exit tracking.
- PnL tracking.
- Setup performance.
- Confidence calibration.
- Mistake notes.

---

## 5. Core Value Proposition

**StrikePilot helps NIFTY/BANKNIFTY options traders move from emotional trade entries to structured, risk-sized, reviewable trading decisions.**

The core differentiator is not only AI-generated analysis, but the full loop:

```text
Analyze chart → Generate risk-sized plan → Save recommendation → Record actual result → Learn from performance
```

---

## 6. Current Product Scope

The current product already includes the following major modules:

### 6.1 Market Snapshot

Fetches and displays live or near-live data for:

- NIFTY
- BANKNIFTY
- India VIX
- USD/INR
- DXY
- Brent crude
- US 10Y yield

### 6.2 Technical Indicator Engine

Computes deterministic indicators without LLM involvement:

- RSI(14)
- EMA 9/21/50
- MACD
- ATR(14)
- VWAP
- Opening range
- CPR levels
- Supertrend
- Trend label
- Nearest support and resistance

### 6.3 Option-Chain Analyzer

Fetches and summarizes NSE option-chain data when available:

- PCR
- Max pain
- Top CE OI strikes
- Top PE OI strikes
- OI change
- ATM option window
- Implied volatility data where available

The product must handle NSE rate limits, regional blocks, or anti-bot failures gracefully.

### 6.4 AI Agent Pipeline

The analysis flow uses multiple AI-assisted stages:

1. Vision agent reads uploaded chart image.
2. Macro agent interprets live macro context.
3. Options agent interprets option-chain data.
4. Strategist agent combines all inputs into a trade or no-trade decision.
5. Confidence agent scores the result.
6. Explanation agent converts the result into beginner or advanced output.

### 6.5 Risk Sizing

The strategist must honor the user's configured risk budget.

```text
risk_inr = capital × (risk_pct / 100)
```

Default lot sizes:

```text
NIFTY lot size = 75
BANKNIFTY lot size = 30
```

The product should only return a trade if the risk-reward and lot sizing are valid.

### 6.6 Journal

Every generated recommendation is saved automatically. The user can track:

- Instrument
- Setup type
- Contract
- AI lots
- Actual lots
- Actual entry
- Actual exit
- Outcome
- PnL
- Confidence
- Mistake reason
- User notes

### 6.7 Performance Dashboard

The product tracks:

- Total recommendations
- Trades taken
- No-trade count
- Closed trades
- Win rate
- Total PnL
- Average win
- Average loss
- Expectancy
- Setup performance
- Confidence calibration
- Daily PnL

---

## 7. User Journey

### 7.1 Analyzer Flow

1. User opens the StrikePilot app.
2. Market ticker loads automatically.
3. User selects capital.
4. User selects risk percentage.
5. User chooses output mode: Beginner or Advanced.
6. User chooses whether overnight trades are allowed.
7. User uploads a NIFTY chart, BANKNIFTY chart, or both.
8. User clicks **Generate trade brief**.
9. System streams pipeline progress.
10. System returns either:
    - Trade recommendation, or
    - No-trade decision.
11. Recommendation is saved to journal.

### 7.2 Journal Flow

1. User opens Journal.
2. User reviews past recommendations.
3. User enters actual lots, actual entry, actual exit, and outcome.
4. System computes or updates PnL.
5. User adds notes and mistake reason.

### 7.3 Performance Flow

1. User opens Performance.
2. User reviews total stats, setup stats, and confidence calibration.
3. User identifies which setups perform well or poorly.
4. User adapts future trading behavior.

---

## 8. Functional Requirements

### 8.1 Market Data

- The app must fetch market snapshot data from Yahoo Finance.
- The frontend must refresh market snapshot data periodically.
- The app must show a clear fallback when data is missing.
- The backend must expose `/api/market`.

### 8.2 Indicator Calculation

- The backend must calculate indicators deterministically.
- The backend must expose `/api/indicators?instrument=NIFTY`.
- The indicator layer must not depend on LLM output.
- Missing indicator values must be treated as unavailable, not invented.

### 8.3 Chart Upload

- The app must support uploading NIFTY and BANKNIFTY chart screenshots.
- The backend must support at least one uploaded chart.
- The backend must reject analysis requests with no chart uploaded.
- The chart image must be passed to the vision-capable AI model.

### 8.4 AI Analysis

- The backend must stream analysis stages using Server-Sent Events.
- The strategist output must be valid structured JSON.
- The system must support `TAKE_TRADE` and `NO_TRADE` decisions.
- The system must include a reason when returning `NO_TRADE`.
- The system must not guarantee profit.

### 8.5 Trade Recommendation

For a valid trade, the response should include:

- Instrument
- Bias
- Setup type
- Option type
- Strike
- Contract
- Entry range
- Stop-loss
- Target 1
- Target 2
- Underlying stop-loss
- Underlying targets
- Lot size
- Number of lots
- Risk amount
- Reward amount
- Risk-reward ratio
- Confidence
- Invalidation condition
- Expected holding time
- Technical reasons
- Macro reasons
- Option-chain reasons

### 8.6 Journal

- The system must save each generated recommendation.
- The user must be able to update actual trade execution fields.
- The user must be able to delete a recommendation.
- The system must support filtering by instrument.
- The system must auto-compute PnL when enough execution data is present.

### 8.7 Performance

- The system must calculate overall performance.
- The system must calculate setup-level performance.
- The system must calculate confidence calibration.
- The system must show learning insights when enough data exists.

---

## 9. Non-Functional Requirements

### 9.1 Reliability

- Data-source failures must not crash the full app.
- NSE option-chain failure must degrade gracefully.
- Azure OpenAI errors must be shown clearly to the user.

### 9.2 Performance

- Market snapshot should load quickly enough for dashboard use.
- Agent pipeline should stream progress so the user is not left waiting with no feedback.
- Frontend should remain responsive during analysis.

### 9.3 Security

- Azure OpenAI keys must never be committed to the repository.
- Production deployment must use environment variables.
- User trade records must be private in a multi-user version.

### 9.4 Compliance and Safety

- The app must clearly state that it is educational software.
- The app must not claim guaranteed profits.
- The app must not place trades automatically.
- The user must remain responsible for all trading decisions.
- Public launch should review applicable financial-advice and market-regulation requirements.

---

## 10. Out of Scope for Current Version

The following are not required in the current version:

- Automatic broker order placement.
- Real-money execution.
- Guaranteed buy/sell signals.
- Multi-asset global stock coverage.
- Fully automated trading bot behavior.
- Social/community copy trading.
- Portfolio management for long-term investing.

---

## 11. Success Metrics

### 11.1 Product Usage

- Number of analyses generated per user.
- Number of saved recommendations.
- Percentage of recommendations updated with actual outcomes.
- Number of returning users.

### 11.2 Trading Review Quality

- Percentage of trades with actual entry and exit filled.
- Percentage of trades with mistake notes.
- Number of closed trades per setup type.

### 11.3 Learning Effectiveness

- Improvement in average expectancy over time.
- Reduction in repeated mistake reasons.
- Confidence calibration gap over time.
- Setup-level win-rate clarity.

### 11.4 System Quality

- Successful analysis completion rate.
- NSE option-chain success/failure rate.
- Azure OpenAI failure rate.
- Average agent pipeline completion time.

---

## 12. Recommended MVP Definition

The MVP should include:

1. Live market snapshot.
2. NIFTY/BANKNIFTY chart upload.
3. AI-assisted chart analysis.
4. Deterministic indicator context.
5. Option-chain context when available.
6. Risk-sized trade/no-trade output.
7. Beginner and Advanced explanation modes.
8. Saved trade journal.
9. Manual actual trade result update.
10. Basic performance dashboard.

This MVP is already mostly represented in the current repository.

---

## 13. Recommended Next Roadmap

### Phase 1: Branding and Product Clarity

- Standardize product name as **StrikePilot** across repo, UI, README, and assets.
- Replace generic stock-market branding with StrikePilot branding.
- Add clear educational and risk disclaimer in UI.
- Add `README` quick-start cleanup.
- Add `.env.example`.

### Phase 2: Production Readiness

- Replace local JSON file storage with PostgreSQL, Supabase, or SQLite.
- Add user authentication.
- Store journal and performance data per user.
- Add backend environment validation.
- Add structured error handling.

### Phase 3: Trading Workflow Improvements

- Add manual override fields for chart levels.
- Add broker trade import for actual execution.
- Add backtesting or replay mode.
- Add export to CSV/PDF.
- Add alerting for repeated setup conditions.

### Phase 4: Monetization

Potential tiers:

1. **Free**
   - Limited daily analyses.
   - Basic journal.

2. **Pro**
   - More analyses.
   - Full performance dashboard.
   - Confidence calibration.
   - Setup analytics.

3. **Advanced**
   - Broker import.
   - Advanced risk analytics.
   - Custom strategy templates.
   - Export and review tools.

---

## 14. Key Risks

### 14.1 Regulatory Risk

Because the app creates structured trading plans, it must be positioned carefully as educational decision support, not as licensed financial advice.

### 14.2 Data Reliability Risk

Yahoo Finance data may be delayed. NSE option-chain access may fail due to rate limits, regional blocks, or anti-bot restrictions.

### 14.3 AI Reliability Risk

The LLM can misread charts or produce invalid assumptions. Deterministic indicators and strict JSON validation should continue to reduce hallucination risk.

### 14.4 User Behavior Risk

Users may overtrust AI output. The UI must repeatedly remind users to verify levels, option prices, liquidity, and risk before placing any real trade.

---

## 15. Open Questions

1. Should the product support only NIFTY/BANKNIFTY, or later include FINNIFTY and MIDCPNIFTY?
2. Should the app integrate with Zerodha/Kite, Upstox, or Angel One for actual trade import?
3. Should recommendations expire after market close?
4. Should the model analyze only screenshots, or also accept TradingView chart data/exported OHLC?
5. What is the correct compliance wording for public release?
6. Should the product support multiple strategies or only AI-classified setup types?

---

## 16. Final Product Positioning

**StrikePilot is an AI-assisted NIFTY/BANKNIFTY options decision desk that helps traders analyze chart setups, size risk, journal execution, and learn from performance — without claiming guaranteed signals or replacing the user's final judgment.**

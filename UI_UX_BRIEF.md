# UI/UX Brief

## Product

**StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options**

## Purpose

This document defines the user experience, visual direction, screen structure, interaction patterns, and UX principles for StrikePilot.

---

## 1. UX Goal

StrikePilot should feel like a calm, professional trading decision desk.

The user should always understand:

1. What data is loaded.
2. What step the AI pipeline is running.
3. Why a trade or no-trade decision was produced.
4. How much money is at risk.
5. What happened after the trade was executed.
6. What the trader should learn from the result.

---

## 2. Design Principles

### 2.1 Risk First

Risk must be visible before any recommendation.

Show:

- Capital
- Risk percentage
- Risk amount in INR
- Lot sizing
- Stop-loss
- Maximum loss estimate

### 2.2 Explain Before Action

The product must not simply say buy/sell. It should explain:

- Chart reason
- Indicator reason
- Option-chain reason
- Macro reason
- Invalid condition
- What can go wrong

### 2.3 No-Trade Is a Valid Output

The no-trade state should feel useful, not like a failure.

No-trade card should explain:

- Why the setup was rejected.
- What conditions need to improve.
- How capital was protected.

### 2.4 Keep Beginner Mode Simple

Beginner mode should avoid heavy jargon.

Use simple wording:

- What to watch
- Entry area
- Stop-loss
- Target
- Risk
- Why this trade
- When to avoid

### 2.5 Keep Advanced Mode Dense but Organized

Advanced mode can include:

- Setup classification
- SMC/structure notes
- Option-chain confluence
- IV/greeks note
- Risk-reward
- Scale-out plan
- Invalidation

---

## 3. Visual Style

### 3.1 Brand Feel

StrikePilot should look:

- Trustworthy
- Modern
- Analytical
- Focused
- High-signal, low-noise

### 3.2 Suggested Palette

| Purpose | Suggested Color |
|---|---|
| Primary navy | `#0F172A` |
| Primary blue | `#2563EB` |
| Teal accent | `#14B8A6` |
| Success green | `#16A34A` |
| Warning amber | `#F59E0B` |
| Danger red | `#DC2626` |
| Background | `#F8FAFC` |
| Card background | `#FFFFFF` |
| Muted text | `#64748B` |

### 3.3 Typography

Recommended style:

- Clean sans-serif.
- Strong hierarchy.
- Large numbers for market prices and risk values.
- Smaller muted text for helper copy.

---

## 4. Core Screens

## 4.1 Global Shell

The global shell should include:

- Live ticker at top.
- Brand block with StrikePilot name.
- Short product description.
- Market condition badge.
- Navigation tabs.

Primary tabs:

```text
Analyzer | Journal | Performance
```

---

## 4.2 Analyzer Screen

### Purpose

Main decision workspace for generating a trade/no-trade brief.

### Sections

1. **Mission Banner**
   - Explains the workflow.
   - Shows risk budget.
   - Shows uploaded chart count.
   - Shows output mode.

2. **Strategy Controls Card**
   - Capital input/chips.
   - Risk slider.
   - Beginner/Advanced mode toggle.
   - Overnight allowed toggle.

3. **Chart Intake Card**
   - NIFTY upload area.
   - BANKNIFTY upload area.
   - Preview thumbnails.
   - Clear chart action.
   - Generate trade brief button.

4. **Agent Pipeline Card**
   - Data quality banner.
   - Market context summary.
   - Pipeline timeline.

5. **Output Area**
   - Trade card.
   - No-trade card.
   - Confidence meter.
   - Risk panel.

### Primary CTA

```text
Generate trade brief
```

### Disabled CTA State

Button should be disabled when:

- No chart uploaded.
- Analysis already running.

---

## 4.3 Trade Card UX

Trade card should show:

- Decision: TAKE TRADE
- Instrument
- Contract
- Direction
- Entry range
- Stop-loss
- Target 1
- Target 2
- Risk-reward
- Lots
- Risk amount
- Confidence
- Invalidation condition

Suggested layout:

```text
Header: Direction + Instrument + Confidence
Main grid: Entry | SL | Target | Lots
Reasoning: Technical | Options | Macro
Risk note: Max loss and invalidation
Journal status: Saved recommendation ID
```

---

## 4.4 No-Trade Card UX

No-trade card should show:

- Decision: NO TRADE
- Reason
- Missing/weak confluence
- What to wait for
- Capital protected message

Tone should be neutral and helpful, not negative.

---

## 4.5 Journal Screen

### Purpose

Help the user compare AI recommendation vs actual execution.

### Table Columns

- When
- Instrument
- Setup
- Contract
- AI lots
- Your lots
- Your entry
- Your exit
- Outcome
- PnL
- Confidence
- Actions

### Editable Fields

- Actual lots
- Actual entry
- Actual exit
- Outcome
- PnL override
- Mistake reason
- User notes

### Expanded Row

Expanded view should show:

- Recommendation vs execution comparison
- AI risk/reward
- Invalidation condition
- Mistake notes
- Stored strategist JSON
- Explanation JSON/text

---

## 4.6 Performance Screen

### Purpose

Turn trade history into learning.

### Sections

1. Overall KPIs
2. Learning insights
3. Setup performance
4. Confidence calibration
5. Daily PnL chart

### UX Goal

The user should quickly understand:

- Are my closed trades profitable?
- Which setups work best?
- Is AI confidence honest?
- What mistakes repeat?

---

## 5. Component Requirements

### 5.1 LiveTicker

Should show compact real-time market values.

Must handle loading and missing data gracefully.

### 5.2 BrandMark

Should visually communicate:

- Direction
- Option strikes
- Market movement
- AI co-pilot concept

Avoid generic stock-market iconography if possible.

### 5.3 SettingsPanel

Must make risk amount visible as user changes capital/risk.

### 5.4 DualChartUploader

Must support:

- Drag and drop
- File preview
- Clear file
- NIFTY and BANKNIFTY separately

### 5.5 AgentTimeline

Must show:

- Idle
- Active
- Done
- Error
- Time taken where available

### 5.6 DataQualityBanner

Must show:

- Good / Partial / Poor
- Missing feeds
- Option-chain availability
- Candle availability

### 5.7 ConfidenceMeter

Must show raw or adjusted confidence clearly.

Should not make confidence look like guaranteed win probability.

---

## 6. Empty States

### Analyzer Empty State

Message:

```text
Upload one or two 15-minute charts and set your risk budget to generate a structured trade brief.
```

### Journal Empty State

Message:

```text
No trades logged yet. Run an analysis in the Analyzer workspace and each recommendation will appear here automatically.
```

### Performance Empty State

Message:

```text
Not enough closed trades yet. Add actual outcomes in the Journal to unlock learning insights.
```

---

## 7. Error States

### Azure Error

Show:

```text
AI analysis failed. Please retry or check Azure configuration.
```

### Market Data Error

Show:

```text
Some market data is unavailable. The system will continue with available context.
```

### Option Chain Error

Show:

```text
NSE option chain is unavailable right now. Analysis will continue without option-chain confluence.
```

### Chart Error

Show:

```text
Please upload a clearer 15-minute candlestick chart.
```

---

## 8. Mobile Responsiveness

Minimum requirements:

- Header stacks cleanly on small screens.
- Analyzer cards become single-column.
- Journal table should horizontally scroll.
- Trade card remains readable on mobile.
- Buttons should be touch-friendly.

---

## 9. Accessibility Requirements

- Buttons must have clear labels.
- Color should not be the only state indicator.
- Inputs must have associated labels.
- Tables should preserve readable column headers.
- Loading and error states should be text-visible.

---

## 10. UX Copy Guidelines

Use:

- Simple, direct language.
- Clear warnings.
- Educational framing.
- Avoid hype.

Avoid:

- Guaranteed profit language.
- Overconfident calls.
- Broker-like execution wording.
- Excessive trading jargon in beginner mode.

---

## 11. Recommended Future UX Improvements

1. Add onboarding screen for first-time users.
2. Add sample chart demo mode.
3. Add setup glossary.
4. Add confidence explanation tooltip.
5. Add risk math explainer.
6. Add CSV/PDF export from Journal.
7. Add keyboard shortcuts for power users.
8. Add broker-import status UI.

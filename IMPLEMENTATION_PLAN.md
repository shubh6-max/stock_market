# Implementation Plan

## Product

**StrikePilot — AI Co-Pilot for NIFTY & BANKNIFTY Options**

## Purpose

This document converts the PRD, TRD, App Flow, UI/UX Brief, and Backend Schema into a practical development roadmap.

---

## 1. Implementation Strategy

The current repository already has a strong working prototype. The implementation plan should focus on making the app clearer, safer, more reliable, and production-ready without breaking the existing flow.

Recommended approach:

```text
Stabilize current prototype → Improve docs and branding → Harden backend → Improve UX → Add production persistence → Add auth → Add advanced trading workflows
```

---

## 2. Phase 0: Documentation and Repo Cleanup

### Goal

Make the repo easier for developers, Codex, and future contributors to understand.

### Tasks

- [x] Add `PRD.md`.
- [x] Add `TRD.md`.
- [x] Add `APP_FLOW.md`.
- [x] Add `UI_UX_BRIEF.md`.
- [x] Add `BACKEND_SCHEMA.md`.
- [x] Add `IMPLEMENTATION_PLAN.md`.
- [ ] Update `README.md` to reference all documentation.
- [ ] Add `.env.example`.
- [ ] Add `docs/` folder later if root docs become too many.

### Acceptance Criteria

- New developer can understand product purpose within 5 minutes.
- README links all major planning documents.
- Setup instructions are clear.

---

## 3. Phase 1: Branding and Product Consistency

### Goal

Make the product consistently branded as StrikePilot.

### Tasks

- [ ] Confirm final product name: `StrikePilot`.
- [ ] Update all UI references to use consistent naming.
- [ ] Add final logo asset.
- [ ] Add favicon/app icon.
- [ ] Replace any generic stock-market wording.
- [ ] Add final tagline:

```text
AI options decision desk for NIFTY & BANKNIFTY
```

### Acceptance Criteria

- README, app header, docs, and UI all use the same product name.
- App icon and logo are present.
- Product positioning is clear and not generic.

---

## 4. Phase 2: Safety and Compliance UX

### Goal

Strengthen educational framing and reduce risk of users overtrusting AI output.

### Tasks

- [ ] Add visible educational disclaimer in Analyzer screen.
- [ ] Add risk warning inside TradeCard.
- [ ] Add `verify on broker terminal` reminder.
- [ ] Add no-guarantee language in README.
- [ ] Add confirmation copy before user acts on recommendation.
- [ ] Rename overly directive labels where needed.

### Suggested Disclaimer

```text
StrikePilot is educational decision-support software. It does not provide guaranteed trading signals or financial advice. Always verify levels, liquidity, option premium, and risk on your broker terminal before placing any trade.
```

### Acceptance Criteria

- Disclaimer visible before or near trade output.
- README clearly states educational-only scope.
- No UI text implies guaranteed profit.

---

## 5. Phase 3: Backend Hardening

### Goal

Make the backend more reliable and easier to debug.

### Tasks

- [ ] Add environment validation on startup.
- [ ] Add `.env.example`.
- [ ] Add structured error responses.
- [ ] Add request validation for `/api/analyze`.
- [ ] Add file type validation for chart uploads.
- [ ] Add file size error handling.
- [ ] Add JSON schema validation for strategist response.
- [ ] Add retry policy for transient Yahoo/NSE errors.
- [ ] Add log levels: info, warn, error.

### Acceptance Criteria

- Server fails fast when required Azure env vars are missing.
- Invalid upload returns clear error.
- JSON parse failure is clearly reported.
- Backend logs are useful for debugging.

---

## 6. Phase 4: Indicator and Risk Engine Tests

### Goal

Protect deterministic logic with tests.

### Tasks

- [ ] Add test framework.
- [ ] Add unit tests for EMA.
- [ ] Add unit tests for RSI.
- [ ] Add unit tests for ATR.
- [ ] Add unit tests for CPR.
- [ ] Add unit tests for VWAP.
- [ ] Add unit tests for opening range.
- [ ] Add unit tests for PnL calculation.
- [ ] Add unit tests for data-quality scoring.

### Acceptance Criteria

- Indicator logic has repeatable test coverage.
- PnL calculation is verified.
- Data-quality bands are verified.

---

## 7. Phase 5: Frontend UX Improvements

### Goal

Improve clarity, trust, and usability.

### Tasks

- [ ] Improve empty states.
- [ ] Add clearer data-quality banner.
- [ ] Add tooltips for risk percentage and confidence.
- [ ] Improve no-trade card.
- [ ] Improve mobile responsiveness.
- [ ] Add loading skeletons.
- [ ] Add better error banners.
- [ ] Add first-time user guidance.

### Acceptance Criteria

- User understands what to do before first analysis.
- User understands missing data warnings.
- User can use Analyzer on smaller screens.
- No-trade output feels useful.

---

## 8. Phase 6: Database Migration

### Goal

Move from local JSON file to a production-ready database.

### Recommended Options

1. Supabase Postgres
2. Local SQLite for desktop/local use
3. Managed PostgreSQL

### Tasks

- [ ] Choose database.
- [ ] Create schema for users, recommendations, and trade_results.
- [ ] Add database connection layer.
- [ ] Add migration script from JSON file.
- [ ] Replace `services/db.js` with DB-backed implementation.
- [ ] Keep JSON fallback for local development if needed.

### Acceptance Criteria

- Existing journal records can be migrated.
- Recommendation create/read/update/delete works with DB.
- Performance dashboard works with DB.

---

## 9. Phase 7: Authentication and User Isolation

### Goal

Support multiple users safely.

### Tasks

- [ ] Add auth provider.
- [ ] Add user table.
- [ ] Attach recommendations to user ID.
- [ ] Filter journal by authenticated user.
- [ ] Filter performance by authenticated user.
- [ ] Protect backend routes.

### Acceptance Criteria

- User A cannot see User B's trades.
- Journal and performance are user-specific.
- API rejects unauthenticated access where required.

---

## 10. Phase 8: Broker Import and Execution Review

### Goal

Improve journal accuracy by importing actual trades.

### Possible Broker Integrations

- Zerodha Kite
- Upstox
- Angel One

### Tasks

- [ ] Add broker import research.
- [ ] Add manual CSV import option first.
- [ ] Match imported trades to recommendations.
- [ ] Detect execution drift.
- [ ] Add slippage analysis.

### Acceptance Criteria

- User can import actual trades.
- System can compare recommended vs actual execution.
- Performance dashboard includes execution drift metrics.

---

## 11. Phase 9: Export and Reporting

### Goal

Make user data portable and reviewable.

### Tasks

- [ ] Export journal to CSV.
- [ ] Export performance summary to CSV.
- [ ] Export single trade report to PDF.
- [ ] Export monthly performance review.

### Acceptance Criteria

- User can download journal.
- User can review reports outside the app.
- Exported data includes enough fields for analysis.

---

## 12. Phase 10: Advanced Strategy Features

### Goal

Increase product depth for advanced users.

### Tasks

- [ ] Add setup glossary.
- [ ] Add custom strategy templates.
- [ ] Add setup filters.
- [ ] Add replay mode.
- [ ] Add alert rules.
- [ ] Add multi-timeframe support.
- [ ] Add manual level input.

### Acceptance Criteria

- Advanced users can customize review workflow.
- Strategies become measurable by type.
- Replay mode supports learning without live trading.

---

## 13. Suggested Task Order for Codex

Use this order for safe implementation:

1. Add `.env.example`.
2. Add backend environment validation.
3. Improve README setup instructions.
4. Add disclaimer component.
5. Add DataQualityBanner improvements.
6. Add unit tests for indicator functions.
7. Add JSON schema validation for strategist output.
8. Add CSV export for journal.
9. Add SQLite/Supabase persistence.
10. Add authentication.

---

## 14. Definition of Done

A task is done when:

- Code builds successfully.
- Existing functionality does not regress.
- User-facing errors are clear.
- README/docs are updated if behavior changes.
- New risk/compliance-sensitive behavior includes disclaimers.
- Manual test path is documented.

---

## 15. Immediate Next Best Changes

Recommended next commits:

1. Add `.env.example`.
2. Add environment validation in backend startup.
3. Add educational disclaimer component to Analyzer.
4. Improve README with docs index and safer setup notes.
5. Add tests for risk/PnL calculations.

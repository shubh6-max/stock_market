import db from "./db.js";
import { nanoid } from "nanoid";

export function saveRecommendation(rec) {
  const id = nanoid(12);
  const now = new Date().toISOString();
  db.insertRecommendation({
    id,
    created_at: now,
    instrument: rec.instrument || "NIFTY",
    spot_at_entry: rec.spot_at_entry ?? null,
    decision: rec.decision || "NO_TRADE",
    setup_type: rec.setup_type ?? null,
    option_type: rec.option_type ?? null,
    strike: rec.strike ?? null,
    contract: rec.contract ?? null,
    entry_low: rec.entry_low ?? null,
    entry_high: rec.entry_high ?? null,
    stop_loss: rec.stop_loss ?? null,
    target_1: rec.target_1 ?? null,
    target_2: rec.target_2 ?? null,
    underlying_sl: rec.underlying_sl ?? null,
    underlying_t1: rec.underlying_t1 ?? null,
    underlying_t2: rec.underlying_t2 ?? null,
    rr_ratio: rec.rr_ratio ?? null,
    lots: rec.lots ?? null,
    lot_size: rec.lot_size ?? null,
    risk_inr: rec.risk_inr ?? null,
    reward_inr: rec.reward_inr ?? null,
    confidence_raw: rec.confidence_raw ?? null,
    confidence_adj: rec.confidence_adj ?? null,
    confidence_label: rec.confidence_label ?? null,
    invalid_condition: rec.invalid_condition ?? null,
    capital: rec.capital ?? null,
    risk_pct: rec.risk_pct ?? null,
    mode: rec.mode ?? null,
    market_context: rec.market_context ?? null,
    chart_analysis: rec.chart_analysis ?? null,
    strategist_json: rec.strategist_json ?? null,
    explanation: rec.explanation ?? null,
    raw_strategist: rec.raw_strategist ?? null,
  });
  return id;
}

export function getRecommendation(id) {
  return db.findRecommendation(id);
}

export function listRecommendations(opts) {
  return db.listRecommendations(opts);
}

// Accepts partial result updates. If `actual_*` fields are present and
// pnl_inr isn't supplied, auto-compute it from the math:
//   pnl = (actual_exit - actual_entry) × lot_size × actual_lots
export function recordResult({
  rec_id,
  outcome,
  exit_price,
  pnl_inr,
  mistake_reason,
  user_note,
  actual_lots,
  actual_entry,
  actual_exit,
}) {
  const existing = db.findResult?.(rec_id) || null;
  const rec = db.findRecommendation(rec_id);
  const lotSize = rec?.lot_size || (rec?.instrument === "BANKNIFTY" ? 30 : 75);

  // Coerce numeric fields
  const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
  const _exit = num(exit_price);
  const _actLots = num(actual_lots);
  const _actEntry = num(actual_entry);
  const _actExit = num(actual_exit);
  let _pnl = num(pnl_inr);

  // Auto-compute pnl when we have actuals and user didn't supply pnl explicitly
  if (_pnl == null && _actLots != null && _actEntry != null && _actExit != null && lotSize) {
    _pnl = Math.round((_actExit - _actEntry) * lotSize * _actLots);
  }

  // Build patch with only the fields the caller supplied
  const patch = {
    rec_id,
    updated_at: new Date().toISOString(),
  };
  if (outcome !== undefined) patch.outcome = outcome;
  if (exit_price !== undefined) patch.exit_price = _exit;
  if (pnl_inr !== undefined || _pnl != null) patch.pnl_inr = _pnl;
  if (mistake_reason !== undefined) patch.mistake_reason = mistake_reason;
  if (user_note !== undefined) patch.user_note = user_note;
  if (actual_lots !== undefined) patch.actual_lots = _actLots;
  if (actual_entry !== undefined) patch.actual_entry = _actEntry;
  if (actual_exit !== undefined) patch.actual_exit = _actExit;

  db.upsertResult(patch);
  return rec_id;
}

export function deleteRecommendation(id) {
  return db.deleteRecommendation(id);
}

export function countRecommendations() {
  return db.count();
}

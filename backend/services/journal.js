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

export function recordResult({ rec_id, outcome, exit_price = null, pnl_inr = null, mistake_reason = null, user_note = null }) {
  db.upsertResult({
    rec_id,
    updated_at: new Date().toISOString(),
    outcome,
    exit_price,
    pnl_inr,
    mistake_reason,
    user_note,
  });
  return rec_id;
}

export function deleteRecommendation(id) {
  return db.deleteRecommendation(id);
}

export function countRecommendations() {
  return db.count();
}

// Deterministic weighted confidence agent.
// Not an LLM. Takes signals from vision + indicators + option chain + strategist
// and produces a score with explicit breakdown, per the spec.

const WEIGHTS = {
  chart_setup: 30,
  trend_alignment: 20,
  volume_confirmation: 15,
  indicator_confirmation: 10,
  option_chain_confirmation: 15,
  risk_reward: 10,
};

export function scoreConfidence({ strategist, vision, indicators, optionAnalysis, riskInr }) {
  if (!strategist) return null;
  const dir = strategist.option_type === "CE" ? "UP" : strategist.option_type === "PE" ? "DOWN" : null;
  if (!dir) {
    return {
      score: 0, label: "no_trade", reason: "Strategist returned NO_TRADE — no confidence to score.",
      breakdown: zeroBreakdown(),
    };
  }

  const out = {};

  // 1. Chart setup quality — taken from vision agent's own visual confidence
  const visualConf = clamp01(vision?.visual_confidence_pct ?? 50) / 100;
  const agrees = vision?.agrees_with_indicators === true ? 1 : vision?.agrees_with_indicators === false ? 0.4 : 0.7;
  out.chart_setup = Math.round(WEIGHTS.chart_setup * visualConf * agrees);

  // 2. Trend alignment with strategist direction
  const trend = indicators?.trend_label || "UNKNOWN";
  let trendScore = 0.5;
  if (dir === "UP") {
    if (trend === "STRONG_UP") trendScore = 1.0;
    else if (trend === "WEAK_UP") trendScore = 0.75;
    else if (trend === "WEAK_DOWN") trendScore = 0.25;
    else if (trend === "STRONG_DOWN") trendScore = 0;
  } else {
    if (trend === "STRONG_DOWN") trendScore = 1.0;
    else if (trend === "WEAK_DOWN") trendScore = 0.75;
    else if (trend === "WEAK_UP") trendScore = 0.25;
    else if (trend === "STRONG_UP") trendScore = 0;
  }
  out.trend_alignment = Math.round(WEIGHTS.trend_alignment * trendScore);

  // 3. Volume confirmation — proxy via vision (visible volume) + supertrend agreement
  const stTrend = indicators?.supertrend?.trend;
  let volScore = 0.6;
  if (stTrend === "UP" && dir === "UP") volScore = 1.0;
  else if (stTrend === "DOWN" && dir === "DOWN") volScore = 1.0;
  else if (stTrend && stTrend !== "NEUTRAL") volScore = 0.2;
  out.volume_confirmation = Math.round(WEIGHTS.volume_confirmation * volScore);

  // 4. Indicator confirmation — VWAP side + RSI not extreme
  let indScore = 0.5;
  const aboveVwap = indicators?.above_vwap;
  if (aboveVwap === true && dir === "UP") indScore += 0.25;
  if (aboveVwap === false && dir === "DOWN") indScore += 0.25;
  const rsi = indicators?.rsi_14;
  if (rsi != null) {
    if (dir === "UP" && rsi > 40 && rsi < 75) indScore += 0.25;
    if (dir === "DOWN" && rsi > 25 && rsi < 60) indScore += 0.25;
    if (dir === "UP" && rsi > 80) indScore -= 0.2; // overbought
    if (dir === "DOWN" && rsi < 20) indScore -= 0.2; // oversold
  }
  indScore = Math.max(0, Math.min(1, indScore));
  out.indicator_confirmation = Math.round(WEIGHTS.indicator_confirmation * indScore);

  // 5. Option chain confirmation
  const oc = optionAnalysis?.data;
  let ocScore = 0.5;
  if (oc) {
    if (oc.bias === "CALL" && dir === "UP") ocScore = 0.9;
    else if (oc.bias === "PUT" && dir === "DOWN") ocScore = 0.9;
    else if (oc.bias === "NEUTRAL") ocScore = 0.5;
    else ocScore = 0.2; // conflicting
    if (oc.iv_environment === "HIGH") ocScore -= 0.15;
  }
  out.option_chain_confirmation = Math.round(WEIGHTS.option_chain_confirmation * ocScore);

  // 6. Risk-reward quality
  const rr = strategist.rr_ratio || 0;
  let rrScore = 0;
  if (rr >= 3) rrScore = 1.0;
  else if (rr >= 2) rrScore = 0.85;
  else if (rr >= 1.5) rrScore = 0.65;
  else if (rr >= 1) rrScore = 0.35;
  out.risk_reward = Math.round(WEIGHTS.risk_reward * rrScore);

  const total = Object.values(out).reduce((a, b) => a + b, 0);
  const label = labelFor(total);

  const reason = buildReason({ total, dir, trend, aboveVwap, rsi, oc, rr, vision });

  return {
    score: total,
    label,
    breakdown: out,
    weights: WEIGHTS,
    reason,
  };
}

function labelFor(s) {
  if (s >= 86) return "very_strong";
  if (s >= 76) return "strong";
  if (s >= 61) return "tradable_cautious";
  if (s >= 41) return "low_confidence";
  return "no_trade";
}

function buildReason({ total, dir, trend, aboveVwap, rsi, oc, rr, vision }) {
  const bits = [];
  bits.push(`Direction ${dir}, score ${total}/100.`);
  if (trend && trend !== "UNKNOWN") bits.push(`Trend label: ${trend.replace("_", " ").toLowerCase()}.`);
  if (aboveVwap != null) bits.push(aboveVwap ? "Price above VWAP." : "Price below VWAP.");
  if (rsi != null) bits.push(`RSI ${rsi.toFixed(1)}.`);
  if (oc?.one_line_summary) bits.push(oc.one_line_summary);
  if (rr) bits.push(`Risk-reward ${rr}.`);
  if (vision?.agrees_with_indicators === false) bits.push("Chart disagrees with indicators — confidence dampened.");
  return bits.join(" ");
}

function clamp01(n) { return Math.max(0, Math.min(100, n || 0)); }
function zeroBreakdown() {
  return Object.fromEntries(Object.entries(WEIGHTS).map(([k]) => [k, 0]));
}

import { setupStats, confidenceCalibration } from "./performance.js";

// Pure-stats Learning Agent (Stage 2 from the spec).
// Given history, produce a confidence adjustment for a candidate setup
// and a set of human-readable insights the Strategist + UI can use.

const MIN_SAMPLE = 5;  // need at least N closed trades to influence

export function adjustConfidence({ rawConfidence, setupType }) {
  if (rawConfidence == null) return { adjusted: null, reason: "no raw confidence" };
  const stats = setupStats();
  const match = setupType ? stats.find((s) => s.setup_type === setupType) : null;

  if (!match || match.closed < MIN_SAMPLE) {
    return {
      adjusted: rawConfidence,
      delta: 0,
      reason: `Not enough historical data for "${setupType || "n/a"}" (${match?.closed || 0} closed). Confidence kept as raw.`,
      sample_size: match?.closed || 0,
      historic_win_rate: match?.win_rate ?? null,
    };
  }

  // If history says win rate < 50%, dampen confidence proportionally.
  // If history says win rate > 60%, allow a modest boost (cap +8).
  const wr = match.win_rate;
  let delta = 0;
  if (wr < 40) delta = -15;
  else if (wr < 50) delta = -8;
  else if (wr < 60) delta = -3;
  else if (wr < 70) delta = +3;
  else delta = +6;

  // Calibration penalty: if same band historically over-promised, dampen.
  const cal = confidenceCalibration();
  const band = cal.find((b) => rawConfidence >= b.min && rawConfidence <= b.max);
  if (band && band.total >= MIN_SAMPLE && band.win_rate != null) {
    const gap = (rawConfidence - band.win_rate); // positive = overconfident
    if (gap > 15) delta -= 5;
    else if (gap > 8) delta -= 2;
  }

  const adjusted = Math.max(0, Math.min(100, Math.round(rawConfidence + delta)));
  return {
    adjusted,
    delta,
    reason: `Setup "${setupType}" historic win-rate ${wr}% over ${match.closed} closed trades. Applied ${delta >= 0 ? "+" : ""}${delta} confidence adjustment.`,
    sample_size: match.closed,
    historic_win_rate: wr,
  };
}

export function insights() {
  const stats = setupStats();
  if (!stats.length) return { tips: [], summary: "No trade history yet — system is running on raw signals only." };
  const tips = [];
  for (const s of stats) {
    if (s.closed >= MIN_SAMPLE) {
      if (s.win_rate >= 65) tips.push({ kind: "favor", setup: s.setup_type, msg: `Strong: ${s.setup_type} — ${s.win_rate}% over ${s.closed} trades. Favor these.` });
      else if (s.win_rate < 40) tips.push({ kind: "avoid", setup: s.setup_type, msg: `Weak: ${s.setup_type} — only ${s.win_rate}% over ${s.closed} trades. Avoid or reduce size.` });
    }
  }
  const cal = confidenceCalibration().filter((b) => b.total >= MIN_SAMPLE);
  for (const b of cal) {
    const gap = (b.min + b.max) / 2 - (b.win_rate || 0);
    if (gap > 15) tips.push({ kind: "calibration", msg: `Confidence band ${b.range}% is over-promising: ${b.win_rate}% actual win-rate. Discounted ${gap.toFixed(0)} pts going forward.` });
  }
  return {
    tips,
    summary: `Reviewed ${stats.reduce((s, x) => s + x.total, 0)} recommendations across ${stats.length} setup types.`,
    setups: stats,
    calibration: cal,
  };
}

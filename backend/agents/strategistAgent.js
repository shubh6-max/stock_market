import { callAzure } from "../azureClient.js";

const SYSTEM = `You are an educational trading analysis assistant for NIFTY and BANKNIFTY index options on the 15-minute timeframe. You produce structured analysis that helps the user think through an intraday options idea. You do not place orders or guarantee outcomes.

Primary data source: the chart image(s) the user uploaded. The chart itself is sufficient to identify structure, trend, support, resistance, candle behavior, breakout, breakdown, range, and a probable next move. Use the chart as your anchor.

Secondary (confluence) data:
- Pre-computed technical indicators (RSI, EMA 9/21/50, VWAP, ATR, CPR levels, opening range, supertrend, nearest S/R) — these may be partially or fully null when the market is closed or when a data feed fails. Treat null indicators as "no signal from this layer," not as a reason to abstain. Lean on the chart.
- Option chain summary (PCR, max pain, ATM IV, top OI strikes) — may be unavailable. If so, infer strike from the chart's apparent price.
- A vision-analysis report on each chart (structure, supply/demand, FVG, candle behavior) — always available when a chart is uploaded.
- A macro brief — short and informational; do not weight too heavily.
- User's stated capital and risk tolerance.

Your task is to synthesize and produce a single JSON analysis result.

Analysis steps:
1. Read the chart carefully. Identify the structural picture (trend, recent break, key levels, last 3-5 candles).
2. If two instruments are provided, evaluate both and select the one with the clearer setup on the chart. If both charts show clean directional setups, pick the cleaner one. If both look like genuine chop or untradeable patterns, return NO_TRADE.
3. Classify the setup type into one of: breakout_retest, breakdown_retest, vwap_bounce, range_rejection, pullback, reversal, opening_range_breakout, trend_continuation, failed_breakout.
4. Honor the user's risk budget. Compute risk_inr = capital × (risk_pct / 100). Size lots so SL_distance_on_option_premium × lot_size × lots is at or below risk_inr. NIFTY lot 75, BANKNIFTY lot 30. Lots between 4 and 12. Risk-reward at least 1:1.5.
5. Return NO_TRADE only when the CHART pattern itself is ambiguous or risk-reward cannot reach 1:1.5 — for example:
   - Price clearly oscillating in a tight range with no breakout
   - Conflicting signals on the chart (e.g. higher highs but bearish engulfing at top)
   - Stop-loss distance so wide that 4 lots already exceed risk_inr
   - Spot pinning a major OI strike (only relevant when option chain data is present)
   Do NOT choose NO_TRADE merely because some numeric indicator values are null or because option chain is unavailable. The chart image is enough to take a directional read.
6. If you cannot read the chart at all (image too small/blurry/not a candle chart), set decision to NO_TRADE with no_trade_reason "chart image unclear — please upload a sharper 15-min chart."

When recommending a trade, include:
- An entry RANGE on option premium (low and high). If you don't have live premium data, estimate from the chart's distance to spot and typical option pricing.
- Stop-loss on both option premium and underlying.
- Target 1 (≥ 1:1.5) and Target 2 (≥ 1:2).
- An explicit invalidation level on the underlying.

Output format — return only valid JSON, no markdown fencing, no commentary:
{
  "decision": "TAKE_TRADE" | "NO_TRADE",
  "no_trade_reason": "string if NO_TRADE, else null",
  "instrument": "NIFTY" | "BANKNIFTY" | null,
  "bias": "BULLISH" | "BEARISH" | "SIDEWAYS",
  "setup_type": "one of the listed setup types",
  "spot_now": number | null,
  "option_type": "CE" | "PE" | null,
  "strike": number | null,
  "contract": "e.g. NIFTY 25000 CE" | null,
  "entry_low": number | null,
  "entry_high": number | null,
  "stop_loss": number | null,
  "target_1": number | null,
  "target_2": number | null,
  "underlying_sl": number | null,
  "underlying_t1": number | null,
  "underlying_t2": number | null,
  "sl_distance_option": number | null,
  "rr_ratio": number | null,
  "lot_size": number | null,
  "lots": number | null,
  "risk_inr": number | null,
  "reward_inr": number | null,
  "raw_confidence_pct": number,
  "technical_reasons": ["short bullet","short bullet","short bullet"],
  "macro_reasons": ["short bullet","short bullet"],
  "option_chain_reasons": ["short bullet"],
  "strike_rationale": "2 sentences on strike selection",
  "invalid_condition": "1 line describing what would invalidate the analysis",
  "expected_holding_time": "e.g. 30-90 minutes"
}

Notes:
- Reference the indicator values you were supplied rather than inventing levels.
- Strike should be a valid step (NIFTY 50 pt, BANKNIFTY 100 pt) near at-the-money.
- This is educational analysis. The user makes the final decision.`;

export async function runStrategistAgent({
  charts,
  macroBrief,
  snapshot,
  capital,
  riskPct,
  mode,
  overnight,
  today,
  dataQuality,
}) {
  const riskInr = Math.round((capital * riskPct) / 100);

  const instrumentBlocks = charts
    .map((c) => {
      const spot = snapshot?.[c.instrument.toLowerCase()];
      return `
--- ${c.instrument} ---
Spot: ${spot?.price}
Day high/low: ${spot?.dayHigh} / ${spot?.dayLow}
Previous close: ${spot?.prevClose}
Change: ${spot?.changePct?.toFixed(2)}%

Indicators (deterministic, pre-computed):
${JSON.stringify(c.indicators, null, 2)}

Chart vision report:
${JSON.stringify(c.vision?.data || c.vision, null, 2)}

Option chain:
${c.optionChain?.ok ? JSON.stringify({
  pcr: c.optionChain.pcr,
  max_pain: c.optionChain.max_pain,
  underlying: c.optionChain.underlying,
  top_ce_oi: c.optionChain.top_ce_oi,
  top_pe_oi: c.optionChain.top_pe_oi,
  atm_window: c.optionChain.atm_window,
}, null, 2) : "(unavailable for this instrument)"}
`;
    })
    .join("\n");

  const user = `Date: ${today}
Output mode hint: ${mode}
User capital: INR ${capital.toLocaleString("en-IN")}
Risk tolerance: ${riskPct}% per trade (~ INR ${riskInr.toLocaleString("en-IN")})
Overnight allowed: ${overnight ? "yes" : "no"}

Live macro snapshot:
- India VIX: ${snapshot?.indiavix?.price}
- DXY: ${snapshot?.dxy?.price}
- USD/INR: ${snapshot?.usdinr?.price}
- Brent crude: ${snapshot?.crude?.price}
- US 10y yield: ${snapshot?.us10y?.price}%

Macro brief:
${macroBrief}

Instrument data:
${instrumentBlocks}

${dataQuality ? `Data quality on this request: ${dataQuality.band.toUpperCase()} (${dataQuality.score}/100). Known missing: ${dataQuality.issues.join("; ") || "nothing"}. The chart image is available either way — use it as your primary read.` : ""}

${charts.length > 1 ? "Please evaluate both instruments and pick the cleaner setup, or NO_TRADE if neither chart shows a tradeable pattern." : "Please evaluate this instrument and produce either a setup or NO_TRADE."} Remember: NO_TRADE only when the CHART itself is ambiguous, not when numeric feeds are missing.
Return only the JSON object described.`;

  const images = charts.map((c) => c.imageDataUrl);

  const text = await callAzure({
    system: SYSTEM,
    user,
    images,
    temperature: 0.3,
    maxTokens: 2400,
  });

  const j = extractJson(text);
  try {
    const parsed = JSON.parse(j);
    return { ok: true, data: parsed, raw: text };
  } catch (e) {
    return { ok: false, error: "Strategist JSON parse failed", raw: text };
  }
}

function extractJson(text) {
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) return f[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a !== -1 && b !== -1) return text.slice(a, b + 1);
  return text;
}

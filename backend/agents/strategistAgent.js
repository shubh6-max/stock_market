import { callAzure } from "../azureClient.js";

const SYSTEM = `You are an educational trading analysis assistant for NIFTY and BANKNIFTY index options on the 15-minute timeframe. You produce structured analysis that helps the user think through an intraday options idea. You do not place orders or guarantee outcomes.

Inputs you receive per request:
- One or two 15-minute chart images (NIFTY and/or BANKNIFTY)
- Pre-computed technical indicators (RSI, EMA 9/21/50, VWAP, ATR, CPR levels, opening range, supertrend, nearest support/resistance)
- Option chain summary (PCR, max pain, ATM IV, top OI strikes) when available
- A vision-analysis report on each chart (structure, supply/demand, FVG, candle behavior)
- A macro brief (DXY, India VIX, crude, USD/INR, US 10y)
- The user's stated capital and risk tolerance

Your task is to synthesize this information and produce a single analysis result in JSON form.

Analysis steps:
1. If two instruments are provided, evaluate both and select the one with the clearer setup, or recommend NO_TRADE for both if neither is clean.
2. Classify the setup type into one of: breakout_retest, breakdown_retest, vwap_bounce, range_rejection, pullback, reversal, opening_range_breakout, trend_continuation, failed_breakout.
3. Honor the user's risk budget. Compute risk_inr = capital × (risk_pct / 100). Size lots so that SL_distance_on_option_premium × lot_size × lots is at or below risk_inr. Use NIFTY lot 75 and BANKNIFTY lot 30. Keep lots between 4 and 12. Risk-reward should be at least 1:1.5.
4. Prefer NO_TRADE when the analysis is inconclusive:
   - Price oscillating inside the CPR (between BC and TC) with narrow range
   - Chart structure conflicting with computed indicators
   - Risk-reward below 1:1.5 with sensible levels
   - India VIX above 18 with no clear directional signal
   - Spot within ~0.1% of a major OI strike (likely pinning)

If recommending a trade, include:
- An entry RANGE on option premium (low and high)
- Stop-loss on both option premium and underlying
- Target 1 (≥ 1:1.5) and Target 2 (≥ 1:2)
- An explicit invalidation level

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

${charts.length > 1 ? "Please evaluate both instruments and pick the cleaner setup, or NO_TRADE if neither qualifies." : "Please evaluate this instrument and produce either a setup or NO_TRADE."}
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

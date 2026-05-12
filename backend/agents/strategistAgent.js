import { callAzure } from "../azureClient.js";

const SYSTEM = `You are a professional institutional intraday trader for NIFTY and BANKNIFTY options.

You are handed:
- One OR two 15-min chart screenshots (NIFTY chart, BANKNIFTY chart — either or both)
- Deterministic indicators for each instrument supplied (RSI, EMA stack, VWAP, ATR, CPR, opening range, supertrend, nearest S/R)
- Real option chain summary for each (PCR, max pain, ATM IV, top OI strikes)
- Vision agent's structural reading for each chart
- Macro brief with live DXY, VIX, crude, USD/INR, US 10y
- User capital + risk %

YOUR JOB
========
1) Compare both setups (if dual) and pick the SINGLE best opportunity — OR say NO_TRADE.
2) Identify the setup_type from this fixed list:
     breakout_retest | breakdown_retest | vwap_bounce | range_rejection | pullback | reversal | opening_range_breakout | trend_continuation | failed_breakout
3) Honor RISK math:
     risk_inr = capital × (risk_pct / 100)
     SL_distance_on_option_premium × lot_size × lots ≤ risk_inr
     NIFTY lot = 75   |   BANKNIFTY lot = 30
     Lots ∈ [4, 12]   |   RR ≥ 1:1.5 minimum

4) PROTECT CAPITAL FIRST. Choose NO_TRADE when:
   - Market is sideways inside the CPR (price between BC and TC) with narrow range
   - Chart disagrees with indicators sharply
   - RR cannot reach 1:1.5 within sensible levels
   - VIX > 18 AND there is no clean directional signal
   - Spot is within 0.1% of a major OI strike (likely pinning)

5) Trade output must include:
   - An ENTRY RANGE (low–high) on the option premium, not a single number
   - SL on option premium AND underlying
   - TARGET 1 (≥ 1:1.5 RR) AND TARGET 2 (≥ 1:2)
   - Explicit INVALIDATION: a price level that proves the trade wrong

OUTPUT — STRICT JSON ONLY (no markdown, no prose):
{
  "decision": "TAKE_TRADE" | "NO_TRADE",
  "no_trade_reason": "string if NO_TRADE, else null",
  "instrument": "NIFTY" | "BANKNIFTY" | null,
  "bias": "BULLISH" | "BEARISH" | "SIDEWAYS",
  "setup_type": "string from the fixed list",
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

  "technical_reasons": ["bullet","bullet","bullet"],
  "macro_reasons": ["bullet","bullet"],
  "option_chain_reasons": ["bullet"],
  "strike_rationale": "2 sentences on why this strike",
  "invalid_condition": "1 line: if X happens, exit",
  "expected_holding_time": "e.g. 30-90 minutes"
}

Rules:
- Never invent levels. Use the indicator values you were given.
- If you choose NO_TRADE, all option fields can be null but you MUST fill setup_type, bias, no_trade_reason, technical_reasons.
- If you have BOTH charts: pick the one with the cleaner setup and tighter invalidation.
- Strike must be a valid step (NIFTY 50pt, BANKNIFTY 100pt) and near-the-money (ATM ± 1 strike).`;

export async function runStrategistAgent({
  charts, // [{ instrument, imageDataUrl, indicators, vision, optionChain }]
  macroBrief,
  snapshot,
  capital,
  riskPct,
  mode,
  overnight,
  today,
}) {
  const riskInr = Math.round((capital * riskPct) / 100);

  // Build user prompt with both instruments' context
  const instrumentBlocks = charts
    .map((c) => {
      const spot = snapshot?.[c.instrument.toLowerCase()];
      return `
========================
== ${c.instrument} ==
========================
Spot now: ${spot?.price}
Day H/L: ${spot?.dayHigh} / ${spot?.dayLow}
Prev close: ${spot?.prevClose}
Change %: ${spot?.changePct?.toFixed(2)}%

INDICATORS (deterministic, computed in code):
${JSON.stringify(c.indicators, null, 2)}

VISION READING:
${JSON.stringify(c.vision?.data || c.vision, null, 2)}

OPTION CHAIN:
${c.optionChain?.ok ? JSON.stringify({
  pcr: c.optionChain.pcr,
  max_pain: c.optionChain.max_pain,
  underlying: c.optionChain.underlying,
  top_ce_oi: c.optionChain.top_ce_oi,
  top_pe_oi: c.optionChain.top_pe_oi,
  atm_window: c.optionChain.atm_window,
}, null, 2) : "(unavailable)"}
`;
    })
    .join("\n");

  const user = `Today: ${today}
Mode: ${mode}
Capital: ₹${capital.toLocaleString("en-IN")}
Risk per trade: ${riskPct}% → MAX RISK ₹${riskInr.toLocaleString("en-IN")}
Overnight: ${overnight ? "ALLOWED" : "NOT ALLOWED"}

LIVE MACRO:
- India VIX: ${snapshot?.indiavix?.price}
- DXY: ${snapshot?.dxy?.price}
- USD/INR: ${snapshot?.usdinr?.price}
- Brent: $${snapshot?.crude?.price}
- US 10y: ${snapshot?.us10y?.price}%

== MACRO BRIEF (text) ==
${macroBrief}

${instrumentBlocks}

Now produce the JSON. ${charts.length > 1 ? "Pick the BEST of the two instruments — or NO_TRADE both." : ""}
Protect capital first. Be honest about NO_TRADE if signals are mixed.`;

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

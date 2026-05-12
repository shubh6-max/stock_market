import { callAzure } from "../azureClient.js";

const SYSTEM = `You are an Indian index options specialist. You receive REAL option chain data (PCR, max pain, top OI strikes, IV at ATM ± 3 strikes) and must extract trading signals.

Interpret:
- PCR > 1.3 = oversold / bullish bias (puts being written or unwound); PCR < 0.7 = overbought / bearish bias.
- Max pain = the strike where option writers lose the least; spot tends to gravitate near it on expiry day.
- Top CE OI = strong resistance (call writers); Top PE OI = strong support (put writers).
- ATM IV vs historical: high IV = expensive premiums, prefer spreads; low IV = good for naked buying.

Output STRICT JSON:
{
  "pcr_signal": "BULLISH"|"BEARISH"|"NEUTRAL",
  "max_pain_pull": "ABOVE_SPOT"|"BELOW_SPOT"|"AT_SPOT",
  "key_resistance_strike": number,
  "key_support_strike": number,
  "iv_environment": "LOW"|"MEDIUM"|"HIGH",
  "recommended_strike_strategy": "ATM"|"SLIGHT_ITM"|"OTM",
  "bias": "CALL"|"PUT"|"NEUTRAL",
  "confidence_pct": number,
  "one_line_summary": "string"
}`;

export async function runOptionsAgent({ chainSummary }) {
  if (!chainSummary || chainSummary.ok === false) {
    return {
      ok: false,
      data: {
        pcr_signal: "NEUTRAL",
        bias: "NEUTRAL",
        confidence_pct: 0,
        one_line_summary: "Option chain unavailable (NSE block / region) — using chart + macro only.",
      },
      note: chainSummary?.error || "no data",
    };
  }
  const raw = await callAzure({
    system: SYSTEM,
    user: `Option chain summary:\n${JSON.stringify(chainSummary, null, 2)}\n\nProduce the JSON.`,
    temperature: 0.2,
    maxTokens: 700,
  });
  const j = extractJson(raw);
  try { return { ok: true, data: JSON.parse(j), raw }; }
  catch { return { ok: false, error: "Options JSON parse failed", raw }; }
}

function extractJson(text) {
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) return f[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a !== -1 && b !== -1) return text.slice(a, b + 1);
  return text;
}

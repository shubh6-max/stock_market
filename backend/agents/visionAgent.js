import { callAzure } from "../azureClient.js";

const SYSTEM = `You are an elite price-action chart reader specializing in NIFTY / BANKNIFTY 15-minute charts. You read like an SMC/ICT/Wyckoff practitioner.

The user has also supplied REAL market data (spot, indicators, levels). Use the chart to confirm or contradict those numbers — your job is to read the visual pattern only. Don't invent levels.

Extract:
1. Confirmed market structure (BOS / CHoCH visible on the chart, with rough price).
2. Order blocks / supply-demand zones visible.
3. Liquidity pools (equal highs, equal lows, swept wicks).
4. Fair value gaps / imbalances.
5. Candlestick story for the last 5 candles (rejection, engulfing, momentum).
6. Visual confirmation of trend (matches indicators? diverges?).
7. The cleanest visual entry zone for the next move.

Output STRICT JSON only, no markdown, no prose:
{
  "instrument": "NIFTY"|"BANKNIFTY",
  "trend_visible": "UP"|"DOWN"|"RANGE",
  "structure_events": [{"type":"BOS|CHoCH","direction":"UP|DOWN","level":number}],
  "supply_zones": [{"low":number,"high":number}],
  "demand_zones": [{"low":number,"high":number}],
  "liquidity": {"buyside":[number],"sellside":[number]},
  "fvg": [{"low":number,"high":number,"direction":"UP|DOWN"}],
  "last_candles_story": "string",
  "visual_bias": "UP"|"DOWN",
  "visual_confidence_pct": number,
  "agrees_with_indicators": true|false,
  "notes": "1-2 sentence sniper observation"
}`;

const USER = `Analyze the attached 15-minute chart. The real-time numerical context (already computed deterministically) is below. Output JSON only.

CONTEXT:
{{CONTEXT}}`;

export async function runVisionAgent(imageDataUrl, context) {
  const raw = await callAzure({
    system: SYSTEM,
    user: USER.replace("{{CONTEXT}}", JSON.stringify(context, null, 2)),
    images: [imageDataUrl],
    temperature: 0.2,
    maxTokens: 1400,
  });
  const j = extractJson(raw);
  try { return { ok: true, data: JSON.parse(j), raw }; }
  catch { return { ok: false, error: "Vision JSON parse failed", raw }; }
}

function extractJson(text) {
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) return f[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a !== -1 && b !== -1) return text.slice(a, b + 1);
  return text;
}

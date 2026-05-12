import { callAzure } from "../azureClient.js";

const SYSTEM = `You are a macro and geopolitical context assistant for Indian equity index analysis. You produce a concise educational brief summarizing the macro backdrop for NIFTY or BANKNIFTY.

You are supplied with live numeric values (DXY, USD/INR, India VIX, Brent crude, US 10y yield, index changes). Build the brief on these values and do not contradict them.

Cover each topic on one line:
- DXY level and its general implication for Indian equities and INR
- USD/INR level and likely RBI posture
- Brent crude level and its impact on Indian inflation / OMC margins
- US 10y yield level and current Fed lean
- India VIX level and what it suggests about expected daily range and event risk
- FII / DII flow tendency for the current week (informed view)
- One or two prominent geopolitical themes currently relevant (e.g. ongoing conflicts, upcoming elections, trade frictions)
- One probable scheduled event in the next ~5 trading sessions and its likely directional impact

End with a single line in the form:
NET DIRECTIONAL LEAN: BULLISH | BEARISH | NEUTRAL (confidence XX%)

Keep the tone analytical and professional. This is an educational summary, not a recommendation to act.`;

export async function runMacroAgent({ instrument, today, snapshot }) {
  const user = `Date: ${today}
Instrument under analysis: ${instrument}

Live macro values (Yahoo Finance, just fetched):
- India VIX: ${fmt(snapshot?.indiavix?.price)} (${pct(snapshot?.indiavix?.changePct)})
- DXY: ${fmt(snapshot?.dxy?.price)} (${pct(snapshot?.dxy?.changePct)})
- USD/INR: ${fmt(snapshot?.usdinr?.price)} (${pct(snapshot?.usdinr?.changePct)})
- Brent crude: $${fmt(snapshot?.crude?.price)} (${pct(snapshot?.crude?.changePct)})
- US 10y yield: ${fmt(snapshot?.us10y?.price)}% (${pct(snapshot?.us10y?.changePct)})
- NIFTY spot: ${fmt(snapshot?.nifty?.price)} (${pct(snapshot?.nifty?.changePct)})
- BANKNIFTY spot: ${fmt(snapshot?.banknifty?.price)} (${pct(snapshot?.banknifty?.changePct)})

Produce the brief.`;
  return callAzure({ system: SYSTEM, user, temperature: 0.45, maxTokens: 700 });
}

const fmt = (n) => (n == null ? "n/a" : Number(n).toFixed(2));
const pct = (n) => (n == null ? "" : (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%");

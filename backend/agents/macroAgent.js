import { callAzure } from "../azureClient.js";

const SYSTEM = `You are a macro & geopolitical strategist for Indian index options. You have REAL live numbers (DXY, USD/INR, crude, US 10y, India VIX). Build the brief ON these numbers — never contradict them.

Cover (one line each):
- DXY regime (level + bias for INR/Indian equity)
- USD/INR level + RBI behavior
- Brent crude level + impact (inflation / OMC margin)
- US 10y yield + Fed lean
- India VIX level + what that means (low = trending day, high = whippy / event risk)
- FII / DII flow tendency this week
- Live geopolitical risks (specific names: wars, elections, China, US-China, ME, EU)
- One probable event in next 5 sessions and expected directional impact

Finish with ONE line exactly:
NET DIRECTIONAL LEAN: BULLISH | BEARISH | NEUTRAL (confidence XX%)

No hedging. No "wait". Pick a side.`;

export async function runMacroAgent({ instrument, today, snapshot }) {
  const user = `Today: ${today}
Instrument: ${instrument}

LIVE MACRO NUMBERS (Yahoo Finance, just fetched):
- India VIX: ${fmt(snapshot?.indiavix?.price)} (${pct(snapshot?.indiavix?.changePct)})
- DXY: ${fmt(snapshot?.dxy?.price)} (${pct(snapshot?.dxy?.changePct)})
- USD/INR: ${fmt(snapshot?.usdinr?.price)} (${pct(snapshot?.usdinr?.changePct)})
- Brent crude: $${fmt(snapshot?.crude?.price)} (${pct(snapshot?.crude?.changePct)})
- US 10y yield: ${fmt(snapshot?.us10y?.price)}% (${pct(snapshot?.us10y?.changePct)})
- Nifty spot: ${fmt(snapshot?.nifty?.price)} (${pct(snapshot?.nifty?.changePct)})
- BankNifty spot: ${fmt(snapshot?.banknifty?.price)} (${pct(snapshot?.banknifty?.changePct)})

Produce the macro brief now.`;
  return callAzure({ system: SYSTEM, user, temperature: 0.45, maxTokens: 700 });
}

const fmt = (n) => (n == null ? "n/a" : Number(n).toFixed(2));
const pct = (n) => (n == null ? "" : (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%");

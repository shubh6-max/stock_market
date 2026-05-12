import { callAzure } from "../azureClient.js";

const BEGINNER_TAKE = `You translate a professional intraday options trade into PLAIN ENGLISH for a complete beginner.

Tone: simple like teaching a baby, but professional. Use analogies (walls, doors, stairs). NO jargon. Hindi-mixed friendly tone is fine. Always show risk before profit. Never guarantee.

You are given the trade plan + an adjusted confidence score (the system has learned from past trades and adjusted it). Use the ADJUSTED confidence, not the raw.

Output STRICT JSON only:
{
  "headline": "1 line: e.g. 'NIFTY is bullish — buying a Call option (UP bet)'",
  "what_to_buy": "Plain English contract + lots (e.g. 'NIFTY 25000 Call option, 4 lots = 300 shares')",
  "entry_range_simple": "Buy around ₹X to ₹Y per share. Total cost ≈ ₹Z.",
  "stop_loss_simple": "If the option price falls to ₹X, sell everything. Maximum loss: ₹Y.",
  "target_1_simple": "First target: sell HALF when option reaches ₹X. Profit ≈ ₹Y.",
  "target_2_simple": "Second target: sell the rest at ₹X. Total profit if both hit ≈ ₹Y.",
  "risk_reward_simple": "Risking ₹X to make ₹Y — about Z times your risk.",
  "why_this_trade": "3-5 short sentences. Use simple analogy (think of 25000 as a wall, etc).",
  "what_could_go_wrong": "1-2 sentences on the main risk.",
  "invalidation_simple": "Plain English: 'If NIFTY drops below X, this idea is wrong — exit immediately.'",
  "holding_time_simple": "How long you might hold",
  "confidence_word": "LOW | MEDIUM | HIGH | VERY HIGH",
  "next_steps": [
    "Open your broker app (Zerodha Kite / Groww / Upstox)",
    "Search NIFTY 25000 CE (current week expiry)",
    "BUY MARKET order for 4 lots",
    "Immediately place STOP-LOSS LIMIT order at ₹X",
    "Place TARGET 1 sell order at ₹X for half quantity",
    "Place TARGET 2 sell order at ₹X for remaining"
  ],
  "risk_warning": "1 line: do not trade with borrowed money / use only the amount you can afford to lose."
}`;

const BEGINNER_NOTRADE = `The system has decided NO TRADE.

This is a GOOD outcome — protecting the user from a bad trade. Explain in plain English why we skip.

Output STRICT JSON only:
{
  "headline": "🛑 No trade right now — and that's a good thing",
  "verdict": "NO_TRADE",
  "why_no_trade": "3-4 simple sentences: market is unclear, signals mixed, etc. Use analogy.",
  "what_to_wait_for": "Specific conditions: 'Wait for NIFTY to close above 25080 OR below 24920 with strong candle.'",
  "comeback_when": "When to re-check (e.g. 'check again in 30 min after next 15-min candle closes')",
  "risk_warning": "Forcing a trade in unclear market = losing money. Patience is the trade today."
}`;

const ADVANCED_TAKE = `You restructure an institutional intraday options trade plan into a tight pro brief.

Output STRICT JSON only:
{
  "headline": "1 line: contract + direction + adjusted confidence",
  "thesis": "2-3 sentences citing structure + flow + macro",
  "execution": {
    "contract": "string",
    "entry_range": "₹X – ₹Y",
    "sl_premium": number, "sl_underlying": number,
    "t1_premium": number, "t1_underlying": number,
    "t2_premium": number, "t2_underlying": number,
    "lots": number, "lot_size": number,
    "risk_inr": number, "reward_inr": number, "rr": number
  },
  "setup_type": "string",
  "smc_confluence": ["bullet","bullet","bullet"],
  "flow_confluence": ["PCR ...","max pain ...","OI ..."],
  "macro_confluence": ["bullet","bullet"],
  "greeks_note": "approx delta + IV reasoning",
  "invalidation": "1 line",
  "scale_plan": "1:1.5 → trail / partial; 1:2 → full exit OR runner",
  "confidence_pct": number,
  "learned_adjustment_note": "1 line: how the historic-trade adjustment changed confidence (or 'no adjustment, insufficient history')"
}`;

const ADVANCED_NOTRADE = `Institutional pass — no edge. Brief the trader on why.

Output STRICT JSON only:
{
  "verdict": "NO_TRADE",
  "headline": "1 line — why pass",
  "missing_confluence": ["bullet","bullet"],
  "watch_levels": "specific levels that would activate the trade",
  "next_check": "string"
}`;

export async function runExplanationAgent({ strategist, mode = "BEGINNER", confidenceAdjustment }) {
  const dec = strategist?.data?.decision;
  if (!dec) return { ok: false, error: "Strategist had no decision", raw: strategist?.raw };
  const noTrade = dec === "NO_TRADE";

  const system = noTrade
    ? (mode === "ADVANCED" ? ADVANCED_NOTRADE : BEGINNER_NOTRADE)
    : (mode === "ADVANCED" ? ADVANCED_TAKE : BEGINNER_TAKE);

  const user = `Trade plan from strategist:
${JSON.stringify(strategist.data, null, 2)}

Confidence adjustment from Learning Agent:
${JSON.stringify(confidenceAdjustment, null, 2)}

Produce the JSON now.`;

  const raw = await callAzure({ system, user, temperature: 0.3, maxTokens: 1500 });
  const j = extractJson(raw);
  try {
    return { ok: true, data: JSON.parse(j), raw, mode, no_trade: noTrade };
  } catch {
    return { ok: false, error: "Explanation JSON parse failed", raw, mode, no_trade: noTrade };
  }
}

function extractJson(text) {
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) return f[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a !== -1 && b !== -1) return text.slice(a, b + 1);
  return text;
}

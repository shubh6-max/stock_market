import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";

import { getDashboardSnapshot, get15mCandles, getDailyCandles, symbolFor } from "./services/marketData.js";
import { computeAll } from "./services/indicators.js";
import { fetchOptionChain } from "./services/optionChain.js";

import { runVisionAgent } from "./agents/visionAgent.js";
import { runMacroAgent } from "./agents/macroAgent.js";
import { runOptionsAgent } from "./agents/optionsAgent.js";
import { runStrategistAgent } from "./agents/strategistAgent.js";
import { runExplanationAgent } from "./agents/explanationAgent.js";
import { scoreConfidence } from "./agents/confidenceAgent.js";

import {
  saveRecommendation, listRecommendations, getRecommendation,
  recordResult, deleteRecommendation, countRecommendations,
} from "./services/journal.js";
import { overallStats, setupStats, confidenceCalibration, dailyPnl } from "./services/performance.js";
import { adjustConfidence, insights as learningInsights } from "./services/learning.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 2 },
});

app.get("/api/health", (_req, res) => res.json({ ok: true, deployment: process.env.AZURE_DEPLOYMENT }));

app.get("/api/market", async (_req, res) => {
  try { res.json(await getDashboardSnapshot()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/indicators", async (req, res) => {
  const instrument = (req.query.instrument || "NIFTY").toUpperCase();
  try {
    const sym = symbolFor(instrument);
    const [c15, cd] = await Promise.all([get15mCandles(sym, 5), getDailyCandles(sym, 30)]);
    res.json({ instrument, candles15m_count: c15.length, indicators: computeAll(c15, cd) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// JOURNAL ROUTES
app.get("/api/journal", (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const instrument = req.query.instrument || null;
  res.json({
    total: countRecommendations(),
    items: listRecommendations({ limit, offset, instrument }),
  });
});

app.get("/api/journal/:id", (req, res) => {
  const r = getRecommendation(req.params.id);
  if (!r) return res.status(404).json({ error: "not found" });
  res.json(r);
});

app.post("/api/journal/:id/result", (req, res) => {
  const { outcome, exit_price, pnl_inr, mistake_reason, user_note } = req.body || {};
  const valid = ["TARGET1_HIT", "TARGET2_HIT", "SL_HIT", "MANUAL_EXIT", "SKIPPED", "OPEN"];
  if (!valid.includes(outcome)) return res.status(400).json({ error: "invalid outcome" });
  const id = recordResult({ rec_id: req.params.id, outcome, exit_price, pnl_inr, mistake_reason, user_note });
  res.json({ ok: true, id });
});

app.delete("/api/journal/:id", (req, res) => {
  const n = deleteRecommendation(req.params.id);
  res.json({ ok: true, deleted: n });
});

// PERFORMANCE ROUTES
app.get("/api/performance", (_req, res) => {
  res.json({
    overall: overallStats(),
    setups: setupStats(),
    confidence_calibration: confidenceCalibration(),
    daily_pnl: dailyPnl(30),
    insights: learningInsights(),
  });
});

// MAIN ANALYZE — dual upload, NO_TRADE-aware
app.post("/api/analyze", upload.fields([{ name: "chart_nifty" }, { name: "chart_banknifty" }]), async (req, res) => {
  const niftyFile = req.files?.chart_nifty?.[0];
  const bankFile = req.files?.chart_banknifty?.[0];
  if (!niftyFile && !bankFile) return res.status(400).json({ error: "Upload at least one chart (chart_nifty or chart_banknifty)" });

  const capital = Number(req.body.capital) || 300000;
  const riskPct = Math.max(0.1, Math.min(5, Number(req.body.riskPct) || 1));
  const mode = (req.body.mode || "BEGINNER").toUpperCase();
  const overnight = String(req.body.overnight) === "true";
  const today = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    send("status", { step: "data", message: "Fetching live spot, OHLC, macro…" });
    const snapshot = await getDashboardSnapshot();

    // Build per-instrument data blocks
    const targets = [];
    if (niftyFile) targets.push({ instrument: "NIFTY", file: niftyFile });
    if (bankFile) targets.push({ instrument: "BANKNIFTY", file: bankFile });

    const charts = await Promise.all(targets.map(async ({ instrument, file }) => {
      const sym = symbolFor(instrument);
      const [c15, cd, oc] = await Promise.all([
        get15mCandles(sym, 5),
        getDailyCandles(sym, 30),
        fetchOptionChain(instrument),
      ]);
      const indicators = computeAll(c15, cd);
      const imageDataUrl = `data:${file.mimetype || "image/png"};base64,${file.buffer.toString("base64")}`;
      return { instrument, imageDataUrl, indicators, optionChain: oc };
    }));

    send("market", {
      snapshot,
      instruments: charts.map((c) => ({
        instrument: c.instrument,
        indicators: c.indicators,
        option_chain_ok: c.optionChain?.ok ?? false,
        pcr: c.optionChain?.pcr,
        max_pain: c.optionChain?.max_pain,
      })),
    });

    send("status", { step: "vision", message: `Vision Analyst reading ${charts.length} chart${charts.length > 1 ? "s" : ""}…` });
    for (const c of charts) {
      c.vision = await runVisionAgent(c.imageDataUrl, {
        instrument: c.instrument,
        spot: snapshot?.[c.instrument.toLowerCase()]?.price,
        key_levels: {
          vwap: c.indicators.vwap, cpr: c.indicators.cpr, opening_range: c.indicators.opening_range,
          ema_9: c.indicators.ema_9, ema_21: c.indicators.ema_21, ema_50: c.indicators.ema_50,
        },
      });
    }
    send("vision", charts.map((c) => ({ instrument: c.instrument, ...c.vision })));

    send("status", { step: "macro", message: "Macro Strategist scanning DXY / VIX / crude…" });
    const primaryInstrument = charts[0].instrument;
    const macro = await runMacroAgent({ instrument: primaryInstrument, today, snapshot });
    send("macro", { text: macro });

    send("status", { step: "options", message: "Options analyst — PCR, max pain, OI buildup…" });
    const optionsResults = [];
    for (const c of charts) {
      const r = await runOptionsAgent({ chainSummary: c.optionChain });
      c.optionAnalysis = r;
      optionsResults.push({ instrument: c.instrument, ...r });
    }
    send("options", optionsResults);

    send("status", { step: "strategist", message: "Strategist comparing setups + risk math…" });
    const strategist = await runStrategistAgent({
      charts, macroBrief: macro, snapshot, capital, riskPct, mode, overnight, today,
    });
    send("strategist", strategist);

    // Confidence + Learning adjustment
    send("status", { step: "confidence", message: "Confidence Agent scoring with weighted breakdown + history…" });
    let confidence = null;
    let adjustment = null;
    let strategistData = strategist?.data;

    if (strategistData && strategistData.decision === "TAKE_TRADE") {
      const chosen = charts.find((c) => c.instrument === strategistData.instrument) || charts[0];
      confidence = scoreConfidence({
        strategist: strategistData,
        vision: chosen.vision?.data,
        indicators: chosen.indicators,
        optionAnalysis: chosen.optionAnalysis,
        riskInr: Math.round(capital * riskPct / 100),
      });
      adjustment = adjustConfidence({
        rawConfidence: confidence?.score ?? strategistData.raw_confidence_pct,
        setupType: strategistData.setup_type,
      });
    } else {
      confidence = { score: 0, label: "no_trade", breakdown: {}, reason: strategistData?.no_trade_reason || "No trade." };
      adjustment = { adjusted: 0, delta: 0, reason: "NO_TRADE — no confidence applied." };
    }
    send("confidence", { confidence, adjustment });

    send("status", { step: "explanation", message: `Explanation Agent (${mode})…` });
    const explanation = await runExplanationAgent({ strategist, mode, confidenceAdjustment: adjustment });
    send("explanation", explanation);

    // Persist
    const persisted = persistRecommendation({
      strategist: strategistData, confidence, adjustment,
      explanation, charts, snapshot, capital, riskPct, mode,
    });
    send("persisted", { id: persisted });

    send("done", { ok: true });
    res.end();
  } catch (err) {
    console.error(err);
    send("error", { message: err.message });
    res.end();
  }
});

function persistRecommendation({ strategist, confidence, adjustment, explanation, charts, snapshot, capital, riskPct, mode }) {
  if (!strategist) return null;
  const s = strategist;
  const instrument = s.instrument || charts[0]?.instrument || "NIFTY";
  const spot = snapshot?.[instrument?.toLowerCase()]?.price ?? null;
  const lotSize = instrument === "BANKNIFTY" ? 30 : 75;

  return saveRecommendation({
    instrument,
    spot_at_entry: s.spot_now ?? spot,
    decision: s.decision || "NO_TRADE",
    setup_type: s.setup_type,
    option_type: s.option_type,
    strike: s.strike,
    contract: s.contract,
    entry_low: s.entry_low,
    entry_high: s.entry_high,
    stop_loss: s.stop_loss,
    target_1: s.target_1,
    target_2: s.target_2,
    underlying_sl: s.underlying_sl,
    underlying_t1: s.underlying_t1,
    underlying_t2: s.underlying_t2,
    rr_ratio: s.rr_ratio,
    lots: s.lots,
    lot_size: s.lot_size || lotSize,
    risk_inr: s.risk_inr,
    reward_inr: s.reward_inr,
    confidence_raw: confidence?.score ?? null,
    confidence_adj: adjustment?.adjusted ?? confidence?.score ?? null,
    confidence_label: confidence?.label ?? null,
    invalid_condition: s.invalid_condition,
    capital, risk_pct: riskPct, mode,
    market_context: { snapshot, indicators: charts.find((c) => c.instrument === instrument)?.indicators },
    chart_analysis: charts.find((c) => c.instrument === instrument)?.vision?.data,
    strategist_json: s,
    explanation: explanation?.data ? JSON.stringify(explanation.data) : (explanation?.raw || null),
    raw_strategist: strategist ? JSON.stringify(strategist) : null,
  });
}

const port = process.env.PORT || 5174;
app.listen(port, () => console.log(`QuantSignal v3 :${port}`));

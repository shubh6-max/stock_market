import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";

import { getDashboardSnapshot, get15mCandles, getDailyCandles, symbolFor, assessDataQuality } from "./services/marketData.js";
import { computeAll } from "./services/indicators.js";
import { fetchOptionChain } from "./services/optionChain.js";
import { registerKiteRoutes } from "./routes/kiteRoutes.js";

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

registerKiteRoutes(app);

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

// Diagnostics — tells the user what data is reachable from this machine right now.
app.get("/api/diagnostics", async (_req, res) => {
  const out = { timestamp: new Date().toISOString(), checks: {} };
  // Yahoo: spot
  try {
    const snap = await getDashboardSnapshot();
    out.checks.yahoo_spot = {
      ok: !!snap?.nifty?.price,
      nifty: snap?.nifty?.price ?? null,
      banknifty: snap?.banknifty?.price ?? null,
      indiavix: snap?.indiavix?.price ?? null,
      error: snap?.nifty?.error || snap?.banknifty?.error || null,
    };
  } catch (e) {
    out.checks.yahoo_spot = { ok: false, error: e.message };
  }
  // Yahoo: 15m candles
  try {
    const c = await get15mCandles("^NSEI", 5);
    out.checks.yahoo_candles_15m = { ok: c.length > 0, count: c.length };
  } catch (e) { out.checks.yahoo_candles_15m = { ok: false, error: e.message }; }
  // Yahoo: daily candles
  try {
    const c = await getDailyCandles("^NSEI", 30);
    out.checks.yahoo_candles_daily = { ok: c.length > 0, count: c.length };
  } catch (e) { out.checks.yahoo_candles_daily = { ok: false, error: e.message }; }
  // NSE option chain
  try {
    const oc = await fetchOptionChain("NIFTY");
    out.checks.nse_option_chain = { ok: oc?.ok === true, pcr: oc?.pcr, max_pain: oc?.max_pain, error: oc?.error };
  } catch (e) { out.checks.nse_option_chain = { ok: false, error: e.message }; }
  // Azure ping (cheap — list of deployment-meta info isn't always exposed, so just confirm env vars exist)
  out.checks.azure_env = {
    ok: !!process.env.AZURE_ENDPOINT && !!process.env.AZURE_API_KEY && !!process.env.AZURE_DEPLOYMENT,
    deployment: process.env.AZURE_DEPLOYMENT || null,
  };
  out.summary = Object.entries(out.checks).map(([k, v]) => `${k}: ${v.ok ? "OK" : "FAIL"}`).join(" | ");
  res.json(out);
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
  const body = req.body || {};
  const validOutcomes = ["TARGET1_HIT", "TARGET2_HIT", "SL_HIT", "MANUAL_EXIT", "SKIPPED", "OPEN"];
  // outcome is optional on partial updates (e.g. user just sets actual_lots)
  if (body.outcome != null && !validOutcomes.includes(body.outcome)) {
    return res.status(400).json({ error: "invalid outcome" });
  }
  recordResult({ rec_id: req.params.id, ...body });
  // Return the updated row so the client can refresh inline
  const updated = getRecommendation(req.params.id);
  res.json({ ok: true, row: updated });
});

// PATCH alias for partial updates (semantically clearer for cell edits)
app.patch("/api/journal/:id", (req, res) => {
  const body = req.body || {};
  const validOutcomes = ["TARGET1_HIT", "TARGET2_HIT", "SL_HIT", "MANUAL_EXIT", "SKIPPED", "OPEN"];
  if (body.outcome != null && !validOutcomes.includes(body.outcome)) {
    return res.status(400).json({ error: "invalid outcome" });
  }
  recordResult({ rec_id: req.params.id, ...body });
  res.json({ ok: true });
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
      const dq = assessDataQuality({
        snapshot: snapshot?.[instrument.toLowerCase()],
        indicators,
        optionChainOk: oc?.ok ?? false,
        candles15mCount: c15.length,
        dailyCandlesCount: cd.length,
      });
      console.log(`[analyze] ${instrument} data quality: ${dq.score}/100 (${dq.band}); issues: ${dq.issues.join(" | ") || "none"}`);
      return { instrument, imageDataUrl, indicators, optionChain: oc, dataQuality: dq, candles15mCount: c15.length };
    }));

    // Aggregate quality across all instruments (worst case)
    const aggregateDQ = {
      score: Math.min(...charts.map((c) => c.dataQuality.score)),
      band: charts.map((c) => c.dataQuality.band).sort((a, b) => ({ poor: 0, partial: 1, good: 2 }[a] - { poor: 0, partial: 1, good: 2 }[b]))[0],
      per_instrument: Object.fromEntries(charts.map((c) => [c.instrument, c.dataQuality])),
    };

    send("market", {
      snapshot,
      data_quality: aggregateDQ,
      instruments: charts.map((c) => ({
        instrument: c.instrument,
        indicators: c.indicators,
        option_chain_ok: c.optionChain?.ok ?? false,
        pcr: c.optionChain?.pcr,
        max_pain: c.optionChain?.max_pain,
        data_quality: c.dataQuality,
      })),
    });

    // Parallel batch: all independent agent calls run concurrently
    // (vision per chart + macro + options per chart). Strategist depends on all.
    send("status", { step: "vision", message: `Vision Analyst reading ${charts.length} chart${charts.length > 1 ? "s" : ""}…` });
    send("status", { step: "macro", message: "Macro Strategist scanning DXY / VIX / crude…" });
    send("status", { step: "options", message: "Options analyst — PCR, max pain, OI buildup…" });

    const primaryInstrument = charts[0].instrument;

    const visionPromises = charts.map((c) =>
      runVisionAgent(c.imageDataUrl, {
        instrument: c.instrument,
        spot: snapshot?.[c.instrument.toLowerCase()]?.price,
        key_levels: {
          vwap: c.indicators.vwap, cpr: c.indicators.cpr, opening_range: c.indicators.opening_range,
          ema_9: c.indicators.ema_9, ema_21: c.indicators.ema_21, ema_50: c.indicators.ema_50,
        },
      }).then((r) => { c.vision = r; return r; })
    );
    const macroPromise = runMacroAgent({ instrument: primaryInstrument, today, snapshot });
    const optionsPromises = charts.map((c) =>
      runOptionsAgent({ chainSummary: c.optionChain }).then((r) => { c.optionAnalysis = r; return r; })
    );

    const [visionResults, macro, optionAnalysisResults] = await Promise.all([
      Promise.all(visionPromises),
      macroPromise,
      Promise.all(optionsPromises),
    ]);

    send("vision", charts.map((c) => ({ instrument: c.instrument, ...c.vision })));
    send("macro", { text: macro });
    send("options", charts.map((c, i) => ({ instrument: c.instrument, ...optionAnalysisResults[i] })));

    send("status", { step: "strategist", message: "Strategist comparing setups + risk math…" });
    const strategist = await runStrategistAgent({
      charts, macroBrief: macro, snapshot, capital, riskPct, mode, overnight, today,
      dataQuality: aggregateDQ,
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
app.listen(port, () => console.log(`StrikePilot :${port}`));

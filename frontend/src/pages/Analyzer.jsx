import { useState } from "react";
import DualChartUploader from "../components/DualChartUploader.jsx";
import AgentTimeline from "../components/AgentTimeline.jsx";
import TradeCard from "../components/TradeCard.jsx";
import NoTradeCard from "../components/NoTradeCard.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import MarketContext from "../components/MarketContext.jsx";
import ConfidenceMeter from "../components/ConfidenceMeter.jsx";
import RiskPanel from "../components/RiskPanel.jsx";

const INITIAL_STEPS = [
  { key: "data", label: "Fetch live spot, OHLC, macro from Yahoo Finance", status: "idle" },
  { key: "vision", label: "Vision Analyst — chart pattern reading", status: "idle" },
  { key: "macro", label: "Macro Strategist — DXY / VIX / crude scan", status: "idle" },
  { key: "options", label: "Options Agent — PCR, max pain, OI buildup", status: "idle" },
  { key: "strategist", label: "Strategist — comparing setups + risk math", status: "idle" },
  { key: "confidence", label: "Confidence Agent — weighted scoring + learning", status: "idle" },
  { key: "explanation", label: "Explanation Agent — your final brief", status: "idle" },
];

export default function Analyzer({ snapshot }) {
  const [niftyFile, setNiftyFile] = useState(null);
  const [niftyPreview, setNiftyPreview] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [bankPreview, setBankPreview] = useState(null);

  const [busy, setBusy] = useState(false);

  // settings
  const [capital, setCapital] = useState(300000);
  const [riskPct, setRiskPct] = useState(1);
  const [mode, setMode] = useState("BEGINNER");
  const [overnight, setOvernight] = useState(false);

  // pipeline state
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [marketCtx, setMarketCtx] = useState(null);
  const [visionData, setVisionData] = useState(null);
  const [macroText, setMacroText] = useState("");
  const [optionsData, setOptionsData] = useState(null);
  const [strategist, setStrategist] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [adjustment, setAdjustment] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [persistedId, setPersistedId] = useState(null);
  const [error, setError] = useState("");
  const [stepTimes, setStepTimes] = useState({});

  function updateStep(key, status) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));
    if (status === "active") setStepTimes((t) => ({ ...t, [key]: Date.now() }));
    if (status === "done") setStepTimes((t) => ({ ...t, [key + "_end"]: Date.now() }));
  }

  function reset() {
    setSteps(INITIAL_STEPS);
    setMarketCtx(null);
    setVisionData(null);
    setMacroText("");
    setOptionsData(null);
    setStrategist(null);
    setConfidence(null);
    setAdjustment(null);
    setExplanation(null);
    setPersistedId(null);
    setError("");
    setStepTimes({});
  }

  async function analyze() {
    if (!niftyFile && !bankFile) return;
    reset();
    setBusy(true);

    const fd = new FormData();
    if (niftyFile) fd.append("chart_nifty", niftyFile);
    if (bankFile) fd.append("chart_banknifty", bankFile);
    fd.append("capital", String(capital));
    fd.append("riskPct", String(riskPct));
    fd.append("mode", mode);
    fd.append("overnight", String(overnight));

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.body) throw new Error("Streaming not supported");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const block of events) handleEvent(block);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleEvent(block) {
    const lines = block.split("\n");
    let event = "message", data = "";
    for (const l of lines) {
      if (l.startsWith("event: ")) event = l.slice(7).trim();
      else if (l.startsWith("data: ")) data += l.slice(6);
    }
    let payload;
    try { payload = JSON.parse(data); } catch { return; }

    if (event === "status") updateStep(payload.step, "active");
    else if (event === "market") { setMarketCtx(payload); updateStep("data", "done"); }
    else if (event === "vision") { setVisionData(payload); updateStep("vision", "done"); }
    else if (event === "macro") { setMacroText(payload.text); updateStep("macro", "done"); }
    else if (event === "options") { setOptionsData(payload); updateStep("options", "done"); }
    else if (event === "strategist") { setStrategist(payload); updateStep("strategist", "done"); }
    else if (event === "confidence") {
      setConfidence(payload.confidence);
      setAdjustment(payload.adjustment);
      updateStep("confidence", "done");
    }
    else if (event === "explanation") { setExplanation(payload); updateStep("explanation", "done"); }
    else if (event === "persisted") setPersistedId(payload.id);
    else if (event === "error") {
      setError(payload.message);
      setSteps((prev) => prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s)));
    }
  }

  const isNoTrade = strategist?.data?.decision === "NO_TRADE" || explanation?.no_trade;
  const chosenInstrument = strategist?.data?.instrument || "NIFTY";

  return (
    <div className="grid">
      {/* LEFT — SETTINGS + UPLOADER */}
      <div>
        <div className="card">
          <h2><span className="num">1</span> Configure</h2>
          <SettingsPanel
            capital={capital} setCapital={setCapital}
            riskPct={riskPct} setRiskPct={setRiskPct}
            mode={mode} setMode={setMode}
            overnight={overnight} setOvernight={setOvernight}
          />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2><span className="num">2</span> Upload charts</h2>
          <DualChartUploader
            niftyFile={niftyFile} niftyPreview={niftyPreview}
            bankFile={bankFile} bankPreview={bankPreview}
            onNifty={(f, u) => { setNiftyFile(f); setNiftyPreview(u); }}
            onBank={(f, u) => { setBankFile(f); setBankPreview(u); }}
            onClearNifty={() => { setNiftyFile(null); setNiftyPreview(null); }}
            onClearBank={() => { setBankFile(null); setBankPreview(null); }}
          />
          <button className="btn-primary" disabled={(!niftyFile && !bankFile) || busy} onClick={analyze}>
            {busy ? "Analyzing live data + charts…" : "⚡ Generate trade signal"}
          </button>
          {(niftyFile || bankFile) && !busy && <button className="btn-ghost" onClick={reset}>Clear results</button>}
          {error && <div className="banner-warning">⚠ {error}</div>}
          <div className="banner-info">
            ⓘ Upload one or both. System picks the cleaner setup — or returns NO TRADE if neither is good enough.
          </div>
        </div>
      </div>

      {/* RIGHT — PIPELINE + RESULTS */}
      <div>
        <div className="card">
          <h2><span className="num">3</span> Agent pipeline</h2>
          <MarketContext market={marketCtx} snapshot={snapshot} instrument={chosenInstrument} />
          <AgentTimeline steps={steps} times={stepTimes} />
        </div>

        {isNoTrade && explanation && (
          <NoTradeCard explanation={explanation} strategist={strategist} mode={mode} />
        )}

        {!isNoTrade && explanation && (
          <>
            {confidence && (
              <ConfidenceMeter
                confidence={confidence}
                adjustment={adjustment}
              />
            )}
            {strategist?.data && (
              <RiskPanel
                strategist={strategist.data}
                capital={capital}
                riskPct={riskPct}
              />
            )}
            <TradeCard
              explanation={explanation}
              strategist={strategist}
              vision={visionData}
              macro={macroText}
              options={optionsData}
              marketCtx={marketCtx}
              mode={mode}
              persistedId={persistedId}
            />
          </>
        )}
      </div>
    </div>
  );
}

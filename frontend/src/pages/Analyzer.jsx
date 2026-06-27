import { useState } from "react";
import DualChartUploader from "../components/DualChartUploader.jsx";
import AgentTimeline from "../components/AgentTimeline.jsx";
import TradeCard from "../components/TradeCard.jsx";
import NoTradeCard from "../components/NoTradeCard.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";
import MarketContext from "../components/MarketContext.jsx";
import ConfidenceMeter from "../components/ConfidenceMeter.jsx";
import RiskPanel from "../components/RiskPanel.jsx";
import DataQualityBanner from "../components/DataQualityBanner.jsx";

const INITIAL_STEPS = [
  { key: "data", label: "Fetch live spot, OHLC, and macro context", status: "idle" },
  { key: "vision", label: "Read chart structure from the uploaded image", status: "idle" },
  { key: "macro", label: "Interpret volatility, dollar, and crude regime", status: "idle" },
  { key: "options", label: "Parse PCR, max pain, and open-interest build-up", status: "idle" },
  { key: "strategist", label: "Combine setup quality with risk sizing rules", status: "idle" },
  { key: "confidence", label: "Score conviction using history and weighting", status: "idle" },
  { key: "explanation", label: "Translate the result into the final brief", status: "idle" },
];

export default function Analyzer({ snapshot }) {
  const [niftyFile, setNiftyFile] = useState(null);
  const [niftyPreview, setNiftyPreview] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [bankPreview, setBankPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [capital, setCapital] = useState(300000);
  const [riskPct, setRiskPct] = useState(1);
  const [mode, setMode] = useState("BEGINNER");
  const [overnight, setOvernight] = useState(false);
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
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, status } : step)));
    if (status === "active") setStepTimes((prev) => ({ ...prev, [key]: Date.now() }));
    if (status === "done") setStepTimes((prev) => ({ ...prev, [`${key}_end`]: Date.now() }));
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

    const formData = new FormData();
    if (niftyFile) formData.append("chart_nifty", niftyFile);
    if (bankFile) formData.append("chart_banknifty", bankFile);
    formData.append("capital", String(capital));
    formData.append("riskPct", String(riskPct));
    formData.append("mode", mode);
    formData.append("overnight", String(overnight));

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!response.body) throw new Error("Streaming not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const block of events) handleEvent(block);
      }
    } catch (eventError) {
      setError(eventError.message || String(eventError));
    } finally {
      setBusy(false);
    }
  }

  function handleEvent(block) {
    const lines = block.split("\n");
    let event = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data += line.slice(6);
    }

    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    if (event === "status") updateStep(payload.step, "active");
    else if (event === "market") {
      setMarketCtx(payload);
      updateStep("data", "done");
    } else if (event === "vision") {
      setVisionData(payload);
      updateStep("vision", "done");
    } else if (event === "macro") {
      setMacroText(payload.text);
      updateStep("macro", "done");
    } else if (event === "options") {
      setOptionsData(payload);
      updateStep("options", "done");
    } else if (event === "strategist") {
      setStrategist(payload);
      updateStep("strategist", "done");
    } else if (event === "confidence") {
      setConfidence(payload.confidence);
      setAdjustment(payload.adjustment);
      updateStep("confidence", "done");
    } else if (event === "explanation") {
      setExplanation(payload);
      updateStep("explanation", "done");
    } else if (event === "persisted") {
      setPersistedId(payload.id);
    } else if (event === "error") {
      setError(payload.message);
      setSteps((prev) => prev.map((step) => (step.status === "active" ? { ...step, status: "error" } : step)));
    }
  }

  const isNoTrade = strategist?.data?.decision === "NO_TRADE" || explanation?.no_trade;
  const chosenInstrument = strategist?.data?.instrument || "NIFTY";
  const uploadedCount = Number(Boolean(niftyFile)) + Number(Boolean(bankFile));
  const riskBudget = Math.round((capital * riskPct) / 100);

  return (
    <div className="page-stack">
      <section className="mission-banner">
        <div className="mission-copy">
          <div className="section-kicker">Workflow</div>
          <h3>Market context, chart evidence, risk math, then execution.</h3>
          <p>
            The analyzer compares NIFTY and BANKNIFTY setups, streams each agent stage, and only returns a trade when the confluence clears the confidence bar.
          </p>
        </div>

        <div className="mission-stats">
          <div className="mission-stat">
            <span className="mission-stat-label">Risk budget</span>
            <strong>₹{riskBudget.toLocaleString("en-IN")}</strong>
            <span className="mission-stat-detail">Per trade at {riskPct.toFixed(2)}%</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Charts loaded</span>
            <strong>{uploadedCount}/2</strong>
            <span className="mission-stat-detail">
              {uploadedCount === 2 ? "Cross-market comparison ready" : "Upload one or both markets"}
            </span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Output style</span>
            <strong>{mode === "ADVANCED" ? "Desk view" : "Guided"}</strong>
            <span className="mission-stat-detail">{overnight ? "Positional trades allowed" : "Intraday discipline enforced"}</span>
          </div>
        </div>
      </section>

      <div className="grid analyzer-grid">
        <div className="stack-col">
          <div className="card">
            <h2><span className="num">1</span> Strategy controls</h2>
            <SettingsPanel
              capital={capital}
              setCapital={setCapital}
              riskPct={riskPct}
              setRiskPct={setRiskPct}
              mode={mode}
              setMode={setMode}
              overnight={overnight}
              setOvernight={setOvernight}
            />
          </div>

          <div className="card">
            <h2><span className="num">2</span> Chart intake</h2>
            <DualChartUploader
              niftyFile={niftyFile}
              niftyPreview={niftyPreview}
              bankFile={bankFile}
              bankPreview={bankPreview}
              onNifty={(file, url) => {
                setNiftyFile(file);
                setNiftyPreview(url);
              }}
              onBank={(file, url) => {
                setBankFile(file);
                setBankPreview(url);
              }}
              onClearNifty={() => {
                setNiftyFile(null);
                setNiftyPreview(null);
              }}
              onClearBank={() => {
                setBankFile(null);
                setBankPreview(null);
              }}
            />
            <button className="btn-primary" disabled={(!niftyFile && !bankFile) || busy} onClick={analyze}>
              {busy ? "Running live analysis..." : "Generate trade brief"}
            </button>
            {(niftyFile || bankFile) && !busy && <button className="btn-ghost" onClick={reset}>Reset workspace</button>}
            {error && <div className="banner-warning">{error}</div>}
            <div className="banner-info">
              Upload one or both markets. The system chooses the cleaner setup, or returns a no-trade verdict when the tape is not worth the risk.
            </div>
          </div>
        </div>

        <div className="stack-col">
          <div className="card">
            <h2><span className="num">3</span> Agent pipeline</h2>
            <DataQualityBanner market={marketCtx} />
            <MarketContext market={marketCtx} snapshot={snapshot} instrument={chosenInstrument} />
            <AgentTimeline steps={steps} times={stepTimes} />
          </div>

          {!explanation && !busy && !error && (
            <div className="card empty-state-card">
              <div className="section-kicker">Awaiting run</div>
              <h3>Load the market, then let the pipeline score the setup.</h3>
              <div className="empty-state-list">
                <div>Set your capital and risk so the strategist can size lots correctly.</div>
                <div>Upload one or two 15-minute chart screenshots with visible structure and key levels.</div>
                <div>Wait for the full agent pass before acting on the brief.</div>
              </div>
            </div>
          )}

          {isNoTrade && explanation && <NoTradeCard explanation={explanation} strategist={strategist} mode={mode} />}

          {!isNoTrade && explanation && (
            <>
              {confidence && <ConfidenceMeter confidence={confidence} adjustment={adjustment} />}
              {strategist?.data && <RiskPanel strategist={strategist.data} capital={capital} riskPct={riskPct} />}
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
    </div>
  );
}

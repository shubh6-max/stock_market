import { useEffect, useRef, useState } from "react";
import LiveTicker from "./components/LiveTicker.jsx";
import Nav from "./components/Nav.jsx";
import BrandMark from "./components/BrandMark.jsx";
import Analyzer from "./pages/Analyzer.jsx";
import Journal from "./pages/Journal.jsx";
import Performance from "./pages/Performance.jsx";
import SwingTrading from "./pages/SwingTrading.jsx";

const MARKET_POLL_MS = 60_000;

const TAB_META = {
  analyzer: {
    title: "Decision Workspace",
    description: "Upload one or two 15-minute charts, stream the agent stack, and turn live context into a sized trade plan.",
  },
  journal: {
    title: "Execution Journal",
    description: "Track what the system recommended, what you actually traded, and where execution drift changed the outcome.",
  },
  performance: {
    title: "Learning and Performance",
    description: "Review setup quality, confidence calibration, and what the system has learned from your closed trades.",
  },
};

function fmtPrice(value) {
  if (value == null) return "--";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(value) {
  if (value == null) return "--";
  const num = Number(value);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function getPulse(snapshot) {
  const vix = snapshot?.indiavix?.price ?? 0;
  const nifty = snapshot?.nifty?.changePct ?? 0;
  const bank = snapshot?.banknifty?.changePct ?? 0;

  if (snapshot?.requires_login) return { label: "Kite login required", tone: "warn" };
  if (vix >= 18 || Math.abs(nifty) >= 1 || Math.abs(bank) >= 1) return { label: "High-volatility session", tone: "warn" };
  if (nifty >= 0 && bank >= 0) return { label: "Risk-on tape", tone: "positive" };
  if (nifty < 0 && bank < 0) return { label: "Risk-off tape", tone: "negative" };
  return { label: "Mixed market breadth", tone: "neutral" };
}

function statusTone(snapshot) {
  if (snapshot?.market_status?.state === "live") return "positive";
  if (snapshot?.market_status?.state === "preopen") return "warn";
  return "neutral";
}

export default function App() {
  const [mode, setMode] = useState("intraday");
  const [tab, setTab] = useState("analyzer");
  const [snapshot, setSnapshot] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/market");
        const data = await response.json();
        setSnapshot(data);
      } catch {}
    }

    load();
    pollRef.current = setInterval(load, MARKET_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  const pulse = getPulse(snapshot);
  const activeTab = TAB_META[tab];
  const marketTone = statusTone(snapshot);
  const marketLabel = snapshot?.market_status?.label || "Checking market";
  const sourceLabel = snapshot?.source === "kite" ? "Live Kite Connect context" : "Market context";
  const isIntraday = mode === "intraday";
  const summaryCards = [
    {
      label: "NIFTY",
      value: fmtPrice(snapshot?.nifty?.price),
      detail: fmtPct(snapshot?.nifty?.changePct),
      tone: (snapshot?.nifty?.changePct ?? 0) >= 0 ? "positive" : "negative",
    },
    {
      label: "BANKNIFTY",
      value: fmtPrice(snapshot?.banknifty?.price),
      detail: fmtPct(snapshot?.banknifty?.changePct),
      tone: (snapshot?.banknifty?.changePct ?? 0) >= 0 ? "positive" : "negative",
    },
    {
      label: "India VIX",
      value: fmtPrice(snapshot?.indiavix?.price),
      detail: snapshot ? "Volatility gauge" : "Waiting for feed",
      tone: (snapshot?.indiavix?.changePct ?? 0) >= 0 ? "warn" : "neutral",
    },
    {
      label: isIntraday ? "Market Status" : "Swing Regime",
      value: isIntraday ? marketLabel : pulse.label,
      detail: isIntraday ? snapshot?.market_status?.detail || "Waiting for feed" : "Used for multi-day stock setup filter",
      tone: isIntraday ? marketTone : pulse.tone,
    },
  ];

  return (
    <>
      <LiveTicker snapshot={snapshot} />
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-block">
            <BrandMark size={52} />
            <div className="brand-copy">
              <div className="eyebrow">AI market decision desk</div>
              <h1>StrikePilot</h1>
              <p className="app-lede">
                Separate workflows for intraday options and swing trading, powered by live Kite market context and strict risk controls.
              </p>
            </div>
          </div>

          <div className="header-badges">
            <span className={`status-pill ${marketTone}`}>{marketLabel}</span>
            <span className={`status-pill ${pulse.tone}`}>{pulse.label}</span>
            <span className="status-pill subtle">{sourceLabel}</span>
          </div>
        </header>

        <section className="mode-tabs" aria-label="Trading mode">
          <button className={`mode-tab ${mode === "intraday" ? "active" : ""}`} onClick={() => setMode("intraday")} type="button">
            <span>Intraday Options</span>
            <small>NIFTY / BANKNIFTY decision desk</small>
          </button>
          <button className={`mode-tab ${mode === "swing" ? "active" : ""}`} onClick={() => setMode("swing")} type="button">
            <span>Swing Trading</span>
            <small>Stock scanner and setup scoring</small>
          </button>
        </section>

        <section className="hero-stats">
          {summaryCards.map((card) => (
            <div key={card.label} className={`hero-stat ${card.tone || "neutral"}`}>
              <div className="hero-stat-label">{card.label}</div>
              <div className="hero-stat-value">{card.value}</div>
              <div className="hero-stat-detail">{card.detail}</div>
            </div>
          ))}
        </section>

        {isIntraday ? (
          <section className="workspace-shell">
            <div className="workspace-heading">
              <div>
                <div className="workspace-label">Intraday Options</div>
                <h2>{activeTab.title}</h2>
                <p>{activeTab.description}</p>
              </div>
              <Nav tab={tab} setTab={setTab} />
            </div>

            {tab === "analyzer" && <Analyzer snapshot={snapshot} />}
            {tab === "journal" && <Journal />}
            {tab === "performance" && <Performance />}
          </section>
        ) : (
          <section className="workspace-shell">
            <div className="workspace-heading">
              <div>
                <div className="workspace-label">Swing Trading</div>
                <h2>Swing Trading Workspace</h2>
                <p>Scan stocks, score setups, review risk-reward, and track multi-day opportunities separately from intraday options.</p>
              </div>
            </div>
            <SwingTrading snapshot={snapshot} />
          </section>
        )}
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import LiveTicker from "./components/LiveTicker.jsx";
import Nav from "./components/Nav.jsx";
import Analyzer from "./pages/Analyzer.jsx";
import Journal from "./pages/Journal.jsx";
import Performance from "./pages/Performance.jsx";

export default function App() {
  const [tab, setTab] = useState("analyzer");
  const [snapshot, setSnapshot] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/market");
        const d = await r.json();
        setSnapshot(d);
      } catch {}
    }
    load();
    pollRef.current = setInterval(load, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <>
      <LiveTicker snapshot={snapshot} />
      <div className="app">
        <div className="header">
          <div className="brand">
            <div className="logo">Q</div>
            <div>
              <h1>QuantSignal</h1>
              <div className="sub">NIFTY / BANKNIFTY · multi-agent intraday co-pilot · self-learning</div>
            </div>
          </div>
          <span className="pill"><span className="dot"></span> Live · Yahoo Finance + NSE</span>
        </div>

        <Nav tab={tab} setTab={setTab} />

        {tab === "analyzer" && <Analyzer snapshot={snapshot} />}
        {tab === "journal" && <Journal />}
        {tab === "performance" && <Performance />}
      </div>
    </>
  );
}

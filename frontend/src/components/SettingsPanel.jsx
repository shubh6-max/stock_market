const CAP_CHIPS = [
  { l: "₹1L", v: 100000 },
  { l: "₹3L", v: 300000 },
  { l: "₹5L", v: 500000 },
  { l: "₹10L", v: 1000000 },
  { l: "₹25L", v: 2500000 },
];

export default function SettingsPanel({
  capital, setCapital,
  riskPct, setRiskPct,
  mode, setMode,
  overnight, setOvernight,
}) {
  const riskInr = Math.round((capital * riskPct) / 100);
  const maxDaily = riskInr * 2;

  return (
    <>
      <div className="field">
        <label>Mode — how AI talks to you</label>
        <div className="toggle-row">
          <button className={`toggle ${mode === "BEGINNER" ? "active" : ""}`} onClick={() => setMode("BEGINNER")}>👶 Beginner</button>
          <button className={`toggle ${mode === "ADVANCED" ? "active" : ""}`} onClick={() => setMode("ADVANCED")}>🧠 Pro</button>
        </div>
        <div className="field-hint">
          {mode === "BEGINNER" ? "Simple language, like a mentor explaining to a baby." : "Institutional brief with greeks/IV/SMC language."}
        </div>
      </div>

      <div className="field">
        <label>Your trading capital</label>
        <div className="input-money">
          <span className="symbol">₹</span>
          <input
            type="number" min={50000} step={10000}
            value={capital}
            onChange={(e) => setCapital(Math.max(50000, Number(e.target.value) || 0))}
          />
          <span className="hint">{capital >= 10000000 ? `${(capital / 10000000).toFixed(2)} Cr` : `${(capital / 100000).toFixed(2)} L`}</span>
        </div>
        <div className="quick-chips">
          {CAP_CHIPS.map((c) => (
            <span key={c.v} className="chip" onClick={() => setCapital(c.v)}>{c.l}</span>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Risk per trade — {riskPct.toFixed(2)}%</label>
        <div className="slider-wrap">
          <input
            type="range" min={0.25} max={2} step={0.05}
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
          />
          <span className="value">{riskPct.toFixed(2)}%</span>
        </div>
        <div className="risk-readout">
          <span>Max loss / trade:</span>
          <span className="v">₹{riskInr.toLocaleString("en-IN")}</span>
        </div>
        <div className="risk-readout">
          <span>Daily loss cap (2× risk):</span>
          <span className="v">₹{maxDaily.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="field">
        <label className={`check-row ${overnight ? "active" : ""}`}>
          <input type="checkbox" checked={overnight} onChange={(e) => setOvernight(e.target.checked)} />
          Allow overnight holding (positional)
        </label>
      </div>
    </>
  );
}

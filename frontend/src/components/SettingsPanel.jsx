const CAP_CHIPS = [
  { label: "₹1L", value: 100000 },
  { label: "₹3L", value: 300000 },
  { label: "₹5L", value: 500000 },
  { label: "₹10L", value: 1000000 },
  { label: "₹25L", value: 2500000 },
];

export default function SettingsPanel({
  capital,
  setCapital,
  riskPct,
  setRiskPct,
  mode,
  setMode,
  overnight,
  setOvernight,
}) {
  const riskInr = Math.round((capital * riskPct) / 100);
  const maxDaily = riskInr * 2;

  return (
    <>
      <div className="field">
        <label>Output mode</label>
        <div className="toggle-row">
          <button className={`toggle ${mode === "BEGINNER" ? "active" : ""}`} onClick={() => setMode("BEGINNER")}>
            Guided
          </button>
          <button className={`toggle ${mode === "ADVANCED" ? "active" : ""}`} onClick={() => setMode("ADVANCED")}>
            Desk view
          </button>
        </div>
        <div className="field-hint">
          {mode === "BEGINNER"
            ? "Plain-language instructions with entry, stop, targets, and execution steps."
            : "Institutional-style brief with flow, structure, and options context."}
        </div>
      </div>

      <div className="field">
        <label>Trading capital</label>
        <div className="input-money">
          <span className="symbol">₹</span>
          <input
            type="number"
            min={50000}
            step={10000}
            value={capital}
            onChange={(event) => setCapital(Math.max(50000, Number(event.target.value) || 0))}
          />
          <span className="hint">
            {capital >= 10000000 ? `${(capital / 10000000).toFixed(2)} Cr` : `${(capital / 100000).toFixed(2)} L`}
          </span>
        </div>
        <div className="quick-chips">
          {CAP_CHIPS.map((chip) => (
            <span key={chip.value} className="chip" onClick={() => setCapital(chip.value)}>
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Risk per trade</label>
        <div className="slider-wrap">
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={riskPct}
            onChange={(event) => setRiskPct(Number(event.target.value))}
          />
          <span className="value">{riskPct.toFixed(2)}%</span>
        </div>
        <div className="risk-readout">
          <span>Max loss / trade:</span>
          <span className="v">₹{riskInr.toLocaleString("en-IN")}</span>
        </div>
        <div className="risk-readout">
          <span>Daily loss cap (2x risk):</span>
          <span className="v">₹{maxDaily.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="field">
        <label className={`check-row ${overnight ? "active" : ""}`}>
          <input type="checkbox" checked={overnight} onChange={(event) => setOvernight(event.target.checked)} />
          Allow overnight holding
        </label>
      </div>
    </>
  );
}

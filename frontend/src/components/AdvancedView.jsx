export default function AdvancedView({ e, s }) {
  if (!e) return null;
  const ex = e.execution || {};
  const dir = s?.option_type === "CE" ? "CALL" : s?.option_type === "PE" ? "PUT" : null;
  const conf = e.confidence_pct ?? 0;
  const confWord = conf >= 80 ? "VERY-HIGH" : conf >= 65 ? "HIGH" : conf >= 50 ? "MEDIUM" : "LOW";

  return (
    <>
      <div className="decision-row">
        {dir && <span className={`decision-badge ${dir}`}>{dir === "CALL" ? "LONG CALL" : "LONG PUT"}</span>}
        <span className={`confidence-badge ${confWord}`}>{conf}% confidence</span>
        {e.setup_type && <span className="setup-tag">{e.setup_type.replace(/_/g, " ")}</span>}
      </div>

      <div className="headline">{e.headline}</div>
      <p className="flow" style={{ marginTop: 10, color: "var(--muted)" }}>{e.thesis}</p>

      <div className="context-grid">
        <div className="pillow"><div className="k">Contract</div><div className="v">{ex.contract}</div></div>
        <div className="pillow"><div className="k">Entry range</div><div className="v">{ex.entry_range}</div></div>
        <div className="pillow"><div className="k">Lots × size</div><div className="v">{ex.lots} × {ex.lot_size}</div></div>
        <div className="pillow"><div className="k">RR</div><div className="v">1 : {ex.rr}</div></div>
        <div className="pillow"><div className="k">SL premium</div><div className="v" style={{color:"var(--red)"}}>₹{ex.sl_premium}</div></div>
        <div className="pillow"><div className="k">T1 premium</div><div className="v" style={{color:"var(--green)"}}>₹{ex.t1_premium}</div></div>
        <div className="pillow"><div className="k">T2 premium</div><div className="v" style={{color:"var(--green)"}}>₹{ex.t2_premium}</div></div>
        <div className="pillow"><div className="k">SL underlying</div><div className="v">{ex.sl_underlying}</div></div>
        <div className="pillow"><div className="k">T1 underlying</div><div className="v">{ex.t1_underlying}</div></div>
        <div className="pillow"><div className="k">T2 underlying</div><div className="v">{ex.t2_underlying}</div></div>
        <div className="pillow"><div className="k">Risk total</div><div className="v" style={{color:"var(--red)"}}>₹{(ex.risk_inr || 0).toLocaleString("en-IN")}</div></div>
        <div className="pillow"><div className="k">Reward total</div><div className="v" style={{color:"var(--green)"}}>₹{(ex.reward_inr || 0).toLocaleString("en-IN")}</div></div>
      </div>

      <div className="section-title">SMC / technical confluence</div>
      <ul className="adv-bullets">{(e.smc_confluence || []).map((b, i) => <li key={i}>{b}</li>)}</ul>

      <div className="section-title">Flow confluence (option chain)</div>
      <ul className="adv-bullets">{(e.flow_confluence || []).map((b, i) => <li key={i}>{b}</li>)}</ul>

      <div className="section-title">Macro confluence</div>
      <ul className="adv-bullets">{(e.macro_confluence || []).map((b, i) => <li key={i}>{b}</li>)}</ul>

      <div className="section-title">Greeks / IV note</div>
      <p className="flow">{e.greeks_note}</p>

      <div className="section-title danger">Invalidation</div>
      <p className="flow">{e.invalidation}</p>

      <div className="section-title success">Scale-out plan</div>
      <p className="flow">{e.scale_plan}</p>

      {e.learned_adjustment_note && (
        <>
          <div className="section-title">Learning adjustment</div>
          <p className="flow" style={{ color: "var(--accent)" }}>🧠 {e.learned_adjustment_note}</p>
        </>
      )}
    </>
  );
}

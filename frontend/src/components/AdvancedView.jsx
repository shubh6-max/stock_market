export default function AdvancedView({ e, s }) {
  if (!e) return null;

  const execution = e.execution || {};
  const direction = s?.option_type === "CE" ? "CALL" : s?.option_type === "PE" ? "PUT" : null;
  const confidence = e.confidence_pct ?? 0;
  const confidenceWord =
    confidence >= 80 ? "VERY-HIGH" :
    confidence >= 65 ? "HIGH" :
    confidence >= 50 ? "MEDIUM" : "LOW";

  return (
    <>
      <div className="decision-row">
        {direction && <span className={`decision-badge ${direction}`}>{direction === "CALL" ? "Long call" : "Long put"}</span>}
        <span className={`confidence-badge ${confidenceWord}`}>{confidence}% confidence</span>
        {e.setup_type && <span className="setup-tag">{e.setup_type.replace(/_/g, " ")}</span>}
      </div>

      <div className="headline">{e.headline}</div>
      <p className="flow" style={{ marginTop: 10, color: "var(--muted)" }}>{e.thesis}</p>

      <div className="context-grid">
        <div className="pillow"><div className="k">Contract</div><div className="v">{execution.contract}</div></div>
        <div className="pillow"><div className="k">Entry range</div><div className="v">{execution.entry_range}</div></div>
        <div className="pillow"><div className="k">Lots x size</div><div className="v">{execution.lots} x {execution.lot_size}</div></div>
        <div className="pillow"><div className="k">RR</div><div className="v">1 : {execution.rr}</div></div>
        <div className="pillow"><div className="k">SL premium</div><div className="v" style={{ color: "var(--red)" }}>₹{execution.sl_premium}</div></div>
        <div className="pillow"><div className="k">T1 premium</div><div className="v" style={{ color: "var(--green)" }}>₹{execution.t1_premium}</div></div>
        <div className="pillow"><div className="k">T2 premium</div><div className="v" style={{ color: "var(--green)" }}>₹{execution.t2_premium}</div></div>
        <div className="pillow"><div className="k">SL underlying</div><div className="v">{execution.sl_underlying}</div></div>
        <div className="pillow"><div className="k">T1 underlying</div><div className="v">{execution.t1_underlying}</div></div>
        <div className="pillow"><div className="k">T2 underlying</div><div className="v">{execution.t2_underlying}</div></div>
        <div className="pillow"><div className="k">Risk total</div><div className="v" style={{ color: "var(--red)" }}>₹{(execution.risk_inr || 0).toLocaleString("en-IN")}</div></div>
        <div className="pillow"><div className="k">Reward total</div><div className="v" style={{ color: "var(--green)" }}>₹{(execution.reward_inr || 0).toLocaleString("en-IN")}</div></div>
      </div>

      <div className="section-title">Structure confluence</div>
      <ul className="adv-bullets">{(e.smc_confluence || []).map((item, index) => <li key={index}>{item}</li>)}</ul>

      <div className="section-title">Flow confluence</div>
      <ul className="adv-bullets">{(e.flow_confluence || []).map((item, index) => <li key={index}>{item}</li>)}</ul>

      <div className="section-title">Macro confluence</div>
      <ul className="adv-bullets">{(e.macro_confluence || []).map((item, index) => <li key={index}>{item}</li>)}</ul>

      <div className="section-title">Greeks and IV note</div>
      <p className="flow">{e.greeks_note}</p>

      <div className="section-title danger">Invalidation</div>
      <p className="flow">{e.invalidation}</p>

      <div className="section-title success">Scale-out plan</div>
      <p className="flow">{e.scale_plan}</p>

      {e.learned_adjustment_note && (
        <>
          <div className="section-title">Learning adjustment</div>
          <p className="flow" style={{ color: "var(--accent)" }}>{e.learned_adjustment_note}</p>
        </>
      )}
    </>
  );
}

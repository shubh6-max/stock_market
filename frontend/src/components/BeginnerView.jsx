export default function BeginnerView({ e, s }) {
  if (!e) return null;

  const isCall = s?.option_type === "CE";

  return (
    <>
      <div className="decision-row">
        <span className={`decision-badge ${isCall ? "CALL" : "PUT"}`}>
          {isCall ? "Buy call" : "Buy put"}
        </span>
        <span className={`confidence-badge ${(e.confidence_word || "MEDIUM").replace(" ", "-")}`}>
          {e.confidence_word}
        </span>
      </div>

      <div className="headline">{e.headline}</div>

      <div className="kv-grid">
        <div className="kv-item">
          <div className="k">What to buy</div>
          <div className="v">{e.what_to_buy}</div>
        </div>
        <div className="kv-item green">
          <div className="k">Entry</div>
          <div className="v">{e.entry_range_simple}</div>
        </div>
        <div className="kv-item red">
          <div className="k">Stop loss</div>
          <div className="v">{e.stop_loss_simple}</div>
        </div>
        <div className="kv-item green">
          <div className="k">Target 1</div>
          <div className="v">{e.target_1_simple}</div>
        </div>
        <div className="kv-item green">
          <div className="k">Target 2</div>
          <div className="v">{e.target_2_simple}</div>
        </div>
        <div className="kv-item amber full">
          <div className="k">Risk to reward</div>
          <div className="v">{e.risk_reward_simple}</div>
        </div>
        {e.holding_time_simple && (
          <div className="kv-item full">
            <div className="k">Holding window</div>
            <div className="v">{e.holding_time_simple}</div>
          </div>
        )}
      </div>

      <div className="section-title success">Why this trade</div>
      <p className="flow">{e.why_this_trade}</p>

      <div className="section-title danger">What could go wrong</div>
      <p className="flow" style={{ color: "var(--red)" }}>{e.what_could_go_wrong}</p>

      {e.invalidation_simple && (
        <>
          <div className="section-title danger">Invalidation</div>
          <p className="flow" style={{ color: "var(--red)" }}>{e.invalidation_simple}</p>
        </>
      )}

      <div className="section-title">Execution steps</div>
      <ol className="steplist">
        {(e.next_steps || []).map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      {e.risk_warning && <div className="banner-warning" style={{ marginTop: 14 }}>{e.risk_warning}</div>}
    </>
  );
}

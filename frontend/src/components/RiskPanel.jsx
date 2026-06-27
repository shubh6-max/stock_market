export default function RiskPanel({ strategist, capital, riskPct }) {
  if (!strategist) return null;

  const lotSize = strategist.lot_size || (strategist.instrument === "BANKNIFTY" ? 30 : 75);
  const lots = strategist.lots || 0;
  const quantity = lotSize * lots;
  const maxLoss = strategist.risk_inr || Math.round(capital * riskPct / 100);
  const targetOneReward = strategist.reward_inr ? Math.round(strategist.reward_inr * 0.5) : null;
  const targetTwoReward = strategist.reward_inr || null;
  const dailyCap = Math.round(capital * riskPct / 100) * 2;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2><span className="num">R</span> Risk panel</h2>
      <div className="risk-grid">
        <div className="risk-cell">
          <div className="k">Capital</div>
          <div className="v">₹{capital.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell">
          <div className="k">Risk %</div>
          <div className="v">{riskPct.toFixed(2)}%</div>
        </div>
        <div className="risk-cell danger">
          <div className="k">Max loss this trade</div>
          <div className="v">₹{maxLoss.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell warn">
          <div className="k">Daily loss cap (2x)</div>
          <div className="v">₹{dailyCap.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell">
          <div className="k">Lots x lot size</div>
          <div className="v">{lots} x {lotSize} = {quantity}</div>
        </div>
        <div className="risk-cell">
          <div className="k">RR ratio</div>
          <div className="v">1 : {strategist.rr_ratio}</div>
        </div>
        <div className="risk-cell danger">
          <div className="k">If stop hits</div>
          <div className="v">-₹{maxLoss.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell success">
          <div className="k">If target 1 hits</div>
          <div className="v">+₹{(targetOneReward || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell success">
          <div className="k">If target 2 hits</div>
          <div className="v">+₹{(targetTwoReward || 0).toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div className="banner-warning" style={{ marginTop: 12 }}>
        Set the stop-loss plan before entering the trade. Do not widen risk and do not average down.
      </div>
    </div>
  );
}

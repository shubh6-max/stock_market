export default function RiskPanel({ strategist, capital, riskPct }) {
  if (!strategist) return null;
  const lot = strategist.lot_size || (strategist.instrument === "BANKNIFTY" ? 30 : 75);
  const lots = strategist.lots || 0;
  const qty = lot * lots;
  const maxLoss = strategist.risk_inr || Math.round(capital * riskPct / 100);
  const t1Reward = strategist.reward_inr ? Math.round(strategist.reward_inr * 0.5) : null;
  const t2Reward = strategist.reward_inr || null;
  const dailyCap = Math.round(capital * riskPct / 100) * 2;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2><span className="num">🛡</span> Risk Panel — protect capital first</h2>
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
          <div className="k">Daily loss cap (2×)</div>
          <div className="v">₹{dailyCap.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell">
          <div className="k">Lots × lot size</div>
          <div className="v">{lots} × {lot} = {qty}</div>
        </div>
        <div className="risk-cell">
          <div className="k">RR ratio</div>
          <div className="v">1 : {strategist.rr_ratio}</div>
        </div>
        <div className="risk-cell danger">
          <div className="k">If SL hits</div>
          <div className="v">-₹{maxLoss.toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell success">
          <div className="k">If Target 1 hits (½)</div>
          <div className="v">+₹{(t1Reward || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="risk-cell success">
          <div className="k">If Target 2 hits (full)</div>
          <div className="v">+₹{(t2Reward || 0).toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div className="banner-warning" style={{ marginTop: 12 }}>
        ⚠ Always set the stop-loss order BEFORE the buy order's profits arrive. Do not move SL further away. Do not average down.
      </div>
    </div>
  );
}

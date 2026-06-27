export default function NoTradeCard({ explanation, strategist }) {
  const e = explanation?.data;
  const s = strategist?.data;
  if (!e) return null;

  return (
    <div className="card no-trade-card" style={{ marginTop: 18 }}>
      <h2><span className="num">4</span> No-trade verdict</h2>
      <div className="no-trade-inner">
        <div className="big">{e.headline || "Stand down for now"}</div>
        <p className="why">{e.why_no_trade || s?.no_trade_reason}</p>

        <div className="section-title">What to wait for</div>
        <p>{e.what_to_wait_for || (s?.technical_reasons || []).join(" | ")}</p>

        {e.comeback_when && (
          <>
            <div className="section-title">When to check again</div>
            <p>{e.comeback_when}</p>
          </>
        )}

        <div className="banner-warning">
          {e.risk_warning || "Forcing a low-clarity setup usually means paying for noise. Preserving capital is the trade today."}
        </div>
      </div>

      <details className="details">
        <summary>Strategist reasoning</summary>
        <pre>{JSON.stringify(s, null, 2)}</pre>
      </details>
    </div>
  );
}

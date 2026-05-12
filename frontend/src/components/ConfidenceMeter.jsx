export default function ConfidenceMeter({ confidence, adjustment }) {
  if (!confidence) return null;
  const raw = confidence.score;
  const adj = adjustment?.adjusted ?? raw;
  const delta = adjustment?.delta ?? 0;

  const labelColor =
    adj >= 86 ? "var(--green)" :
    adj >= 76 ? "var(--green)" :
    adj >= 61 ? "var(--accent)" :
    adj >= 41 ? "var(--amber)" : "var(--red)";

  const friendlyLabel =
    adj >= 86 ? "Very Strong" :
    adj >= 76 ? "Strong" :
    adj >= 61 ? "Tradable (Cautious)" :
    adj >= 41 ? "Low Confidence" : "Avoid";

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2><span className="num">★</span> Confidence — weighted scoring + history</h2>

      <div className="conf-row">
        <div className="conf-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff5d6c" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#22d39a" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r="72" stroke="#2a3553" strokeWidth="14" fill="none" />
            <circle
              cx="90" cy="90" r="72"
              stroke="url(#grad)"
              strokeWidth="14"
              fill="none"
              strokeDasharray={`${(adj / 100) * 452.4} 452.4`}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <text x="90" y="92" textAnchor="middle" fill={labelColor} fontSize="38" fontWeight="800">{adj}</text>
            <text x="90" y="115" textAnchor="middle" fill="var(--muted)" fontSize="11" letterSpacing="2">/100</text>
          </svg>
          <div className="conf-label" style={{ color: labelColor }}>{friendlyLabel}</div>
          {delta !== 0 && (
            <div className={`conf-delta ${delta > 0 ? "pos" : "neg"}`}>
              {delta > 0 ? "+" : ""}{delta} from history
            </div>
          )}
        </div>

        <div className="conf-breakdown">
          <div className="breakdown-title">Score breakdown</div>
          {Object.entries(confidence.breakdown || {}).map(([k, v]) => {
            const max = confidence.weights?.[k] ?? 0;
            const pct = max ? Math.round((v / max) * 100) : 0;
            return (
              <div key={k} className="bd-row">
                <div className="bd-label">{k.replace(/_/g, " ")}</div>
                <div className="bd-bar"><div className="bd-fill" style={{ width: `${pct}%` }} /></div>
                <div className="bd-val">{v}/{max}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="conf-reason">
        <div className="rea-title">Reasoning</div>
        <p>{confidence.reason}</p>
        {adjustment?.reason && (
          <p style={{ color: "var(--accent)", marginTop: 6 }}>
            🧠 <strong>Learning Agent:</strong> {adjustment.reason}
          </p>
        )}
      </div>
    </div>
  );
}

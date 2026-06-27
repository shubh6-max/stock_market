export default function ConfidenceMeter({ confidence, adjustment }) {
  if (!confidence) return null;

  const raw = confidence.score;
  const adjusted = adjustment?.adjusted ?? raw;
  const delta = adjustment?.delta ?? 0;

  const labelColor =
    adjusted >= 86 ? "var(--green)" :
    adjusted >= 76 ? "var(--green)" :
    adjusted >= 61 ? "var(--accent)" :
    adjusted >= 41 ? "var(--amber)" : "var(--red)";

  const friendlyLabel =
    adjusted >= 86 ? "Very strong" :
    adjusted >= 76 ? "Strong" :
    adjusted >= 61 ? "Tradable with caution" :
    adjusted >= 41 ? "Low confidence" : "Avoid";

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2><span className="num">C</span> Confidence and weighting</h2>

      <div className="conf-row">
        <div className="conf-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180" aria-label="Confidence score">
            <defs>
              <linearGradient id="confidence-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d65b4c" />
                <stop offset="50%" stopColor="#d89a36" />
                <stop offset="100%" stopColor="#2f8f74" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r="72" stroke="#d5dfea" strokeWidth="14" fill="none" />
            <circle
              cx="90"
              cy="90"
              r="72"
              stroke="url(#confidence-gradient)"
              strokeWidth="14"
              fill="none"
              strokeDasharray={`${(adjusted / 100) * 452.4} 452.4`}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <text x="90" y="92" textAnchor="middle" fill={labelColor} fontSize="38" fontWeight="800">{adjusted}</text>
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
          {Object.entries(confidence.breakdown || {}).map(([key, value]) => {
            const max = confidence.weights?.[key] ?? 0;
            const percent = max ? Math.round((value / max) * 100) : 0;
            return (
              <div key={key} className="bd-row">
                <div className="bd-label">{key.replace(/_/g, " ")}</div>
                <div className="bd-bar"><div className="bd-fill" style={{ width: `${percent}%` }} /></div>
                <div className="bd-val">{value}/{max}</div>
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
            <strong>Learning note:</strong> {adjustment.reason}
          </p>
        )}
      </div>
    </div>
  );
}

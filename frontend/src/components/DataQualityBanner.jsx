export default function DataQualityBanner({ market }) {
  const dq = market?.data_quality;
  if (!dq) return null;
  if (dq.band === "good") return null; // hide when everything's fine

  const color =
    dq.band === "poor" ? "var(--red)" :
    dq.band === "partial" ? "var(--amber)" : "var(--green)";

  const headline =
    dq.band === "poor"
      ? `⚠ Data quality poor (${dq.score}/100) — analysis will lean almost entirely on the chart image.`
      : `ℹ Data partially available (${dq.score}/100) — chart will be the primary signal.`;

  const allIssues = Array.from(new Set(
    Object.values(dq.per_instrument || {}).flatMap((d) => d.issues || [])
  ));

  return (
    <div className="dq-banner" style={{ borderColor: color, color }}>
      <div className="dq-headline">{headline}</div>
      {allIssues.length > 0 && (
        <ul className="dq-list">
          {allIssues.map((i, idx) => <li key={idx}>{i}</li>)}
        </ul>
      )}
      <div className="dq-hint">
        💡 Tip: include <strong>VWAP</strong>, <strong>EMA 21</strong>, <strong>CPR</strong> and <strong>previous-day high/low</strong> on the chart screenshot so the Vision Agent can read them visually when the data feed is down.
      </div>
    </div>
  );
}

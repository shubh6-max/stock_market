export default function DataQualityBanner({ market }) {
  const dataQuality = market?.data_quality;
  if (!dataQuality || dataQuality.band === "good") return null;

  const color =
    dataQuality.band === "poor" ? "var(--red)" :
    dataQuality.band === "partial" ? "var(--amber)" : "var(--green)";

  const headline =
    dataQuality.band === "poor"
      ? `Data quality is weak (${dataQuality.score}/100). The analysis will lean heavily on the chart image.`
      : `Data is partially available (${dataQuality.score}/100). The chart will be the primary signal.`;

  const allIssues = Array.from(
    new Set(Object.values(dataQuality.per_instrument || {}).flatMap((item) => item.issues || [])),
  );

  return (
    <div className="dq-banner" style={{ borderColor: color, color }}>
      <div className="dq-headline">{headline}</div>
      {allIssues.length > 0 && (
        <ul className="dq-list">
          {allIssues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
      )}
      <div className="dq-hint">
        Include <strong>VWAP</strong>, <strong>EMA 21</strong>, <strong>CPR</strong>, and <strong>previous-day high/low</strong> on the chart so the vision model can recover context when the live feed is thin.
      </div>
    </div>
  );
}

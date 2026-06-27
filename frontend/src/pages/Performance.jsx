import { useEffect, useState } from "react";

function fmtInr(value) {
  if (value == null) return "--";
  const number = Number(value);
  return `${number >= 0 ? "+" : "-"}₹${Math.abs(number).toLocaleString("en-IN")}`;
}

export default function Performance() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/performance").then((response) => response.json()).then(setData);
  }, []);

  if (!data) return <div className="card" style={{ marginTop: 8 }}>Loading...</div>;

  const overall = data.overall;
  const setups = data.setups || [];
  const calibration = data.confidence_calibration || [];
  const tips = data.insights?.tips || [];
  const dailyPnl = data.daily_pnl || [];

  return (
    <div className="page-stack">
      <section className="mission-banner compact">
        <div className="mission-copy">
          <div className="section-kicker">Feedback loop</div>
          <h3>Measure what works, what drifts, and where confidence is honest.</h3>
          <p>
            This view turns closed trades into calibration. Use it to judge setup quality, confidence integrity, and whether the learning layer is improving your decision process.
          </p>
        </div>
        <div className="mission-stats">
          <div className="mission-stat">
            <span className="mission-stat-label">Closed trades</span>
            <strong>{overall.trades_closed}</strong>
            <span className="mission-stat-detail">Enough data for meaningful review</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Win rate</span>
            <strong>{overall.win_rate == null ? "--" : `${overall.win_rate}%`}</strong>
            <span className="mission-stat-detail">Across all closed trades</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Expectancy</span>
            <strong>{fmtInr(overall.expectancy_inr)}</strong>
            <span className="mission-stat-detail">Average result per trade</span>
          </div>
        </div>
      </section>

      <div className="card" style={{ marginTop: 8 }}>
        <h2><span className="num">P</span> Overall</h2>
        <div className="kpi-grid">
          <Kpi label="Total recs" value={overall.total_recommendations} />
          <Kpi label="Trades taken" value={overall.trades_taken} />
          <Kpi label="No-trades" value={overall.no_trades} hint="Capital protected" />
          <Kpi label="Trades closed" value={overall.trades_closed} />
          <Kpi label="Win rate" value={overall.win_rate == null ? "--" : `${overall.win_rate}%`} color={winColor(overall.win_rate)} />
          <Kpi label="Total PnL" value={fmtInr(overall.total_pnl_inr)} color={overall.total_pnl_inr >= 0 ? "var(--green)" : "var(--red)"} />
          <Kpi label="Avg win" value={fmtInr(overall.avg_win_inr)} color="var(--green)" />
          <Kpi label="Avg loss" value={fmtInr(overall.avg_loss_inr)} color="var(--red)" />
          <Kpi label="Expectancy / trade" value={fmtInr(overall.expectancy_inr)} color={overall.expectancy_inr >= 0 ? "var(--green)" : "var(--red)"} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">L</span> What the learning agent has learned</h2>
        {tips.length === 0 && (
          <div className="banner-info">
            Not enough closed trades yet. The learning loop becomes more useful after roughly five closed trades per setup.
          </div>
        )}
        {tips.map((tip, index) => (
          <div key={index} className={`tip tip-${tip.kind}`}>
            <span className="tip-kind">{tip.kind === "favor" ? "FAVOR" : tip.kind === "avoid" ? "AVOID" : "CALIBRATE"}</span>
            <span>{tip.msg}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">S</span> Setup performance</h2>
        {setups.length === 0 && <div className="banner-info">No setup data yet.</div>}
        {setups.length > 0 && (
          <table className="journal-table">
            <thead>
              <tr>
                <th>Setup</th>
                <th>Total</th>
                <th>Closed</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win rate</th>
                <th>Avg confidence</th>
                <th>Bar</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((setup) => (
                <tr key={setup.setup_type}>
                  <td className="setup">{setup.setup_type.replace(/_/g, " ")}</td>
                  <td>{setup.total}</td>
                  <td>{setup.closed}</td>
                  <td className="pos">{setup.wins}</td>
                  <td className="neg">{setup.losses}</td>
                  <td className={setup.win_rate >= 60 ? "pos" : setup.win_rate < 40 ? "neg" : ""}>
                    {setup.win_rate == null ? "--" : `${setup.win_rate}%`}
                  </td>
                  <td>{setup.avg_confidence}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${setup.win_rate || 0}%`,
                          background: setup.win_rate >= 60 ? "var(--green)" : setup.win_rate < 40 ? "var(--red)" : "var(--amber)",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">C</span> Confidence calibration</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
          Did 70%-confidence recommendations actually win 70% of the time? Each row compares the band&apos;s promise against the realised win rate.
        </p>
        {calibration.every((band) => band.total === 0) ? (
          <div className="banner-info">No closed trades yet to calibrate against.</div>
        ) : (
          <table className="journal-table">
            <thead>
              <tr>
                <th>Confidence band</th>
                <th>Closed</th>
                <th>Wins</th>
                <th>Real win rate</th>
                <th>Calibration</th>
              </tr>
            </thead>
            <tbody>
              {calibration.map((band) => {
                const midpoint = (band.min + band.max) / 2;
                const gap = band.win_rate != null ? band.win_rate - midpoint : null;
                const color =
                  band.win_rate == null ? "var(--muted)" :
                  Math.abs(gap) <= 5 ? "var(--green)" :
                  gap > 0 ? "var(--accent)" : "var(--amber)";
                const text =
                  band.win_rate == null ? "--" :
                  Math.abs(gap) <= 5 ? "Calibrated" :
                  gap > 0 ? `Under-promised by ${gap.toFixed(0)} pts` :
                  `Over-promised by ${Math.abs(gap).toFixed(0)} pts`;

                return (
                  <tr key={band.range}>
                    <td>{band.range}%</td>
                    <td>{band.total}</td>
                    <td>{band.wins}</td>
                    <td>{band.win_rate == null ? "--" : `${band.win_rate}%`}</td>
                    <td style={{ color }}>{text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {dailyPnl.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2><span className="num">D</span> Daily PnL (last 30 days)</h2>
          <DailyChart data={dailyPnl} />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, color }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

function winColor(winRate) {
  if (winRate == null) return "var(--muted)";
  if (winRate >= 60) return "var(--green)";
  if (winRate < 40) return "var(--red)";
  return "var(--amber)";
}

function DailyChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((item) => Math.abs(item.pnl)));

  return (
    <div className="bar-chart">
      {data.map((item) => {
        const percent = max ? (Math.abs(item.pnl) / max) * 100 : 0;
        const color = item.pnl >= 0 ? "var(--green)" : "var(--red)";
        return (
          <div key={item.day} className="bc-col" title={`${item.day}: ₹${item.pnl.toLocaleString("en-IN")} (${item.trades} trades)`}>
            <div className="bc-bar" style={{ height: `${percent}%`, background: color }} />
            <div className="bc-label">{item.day.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

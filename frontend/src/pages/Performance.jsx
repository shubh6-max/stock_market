import { useEffect, useState } from "react";

function fmtInr(n) {
  if (n == null) return "—";
  const v = Number(n);
  return (v >= 0 ? "+" : "−") + "₹" + Math.abs(v).toLocaleString("en-IN");
}

export default function Performance() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/performance").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="card" style={{ marginTop: 8 }}>Loading…</div>;

  const o = data.overall;
  const setups = data.setups || [];
  const cal = data.confidence_calibration || [];
  const tips = data.insights?.tips || [];
  const dailyPnl = data.daily_pnl || [];

  return (
    <div>
      <div className="card" style={{ marginTop: 8 }}>
        <h2><span className="num">📈</span> Overall</h2>
        <div className="kpi-grid">
          <Kpi label="Total recs" value={o.total_recommendations} />
          <Kpi label="Trades taken" value={o.trades_taken} />
          <Kpi label="No-trades" value={o.no_trades} hint="Capital protected" />
          <Kpi label="Trades closed" value={o.trades_closed} />
          <Kpi label="Win rate" value={o.win_rate == null ? "—" : `${o.win_rate}%`} color={winColor(o.win_rate)} />
          <Kpi label="Total PnL" value={fmtInr(o.total_pnl_inr)} color={o.total_pnl_inr >= 0 ? "var(--green)" : "var(--red)"} />
          <Kpi label="Avg win" value={fmtInr(o.avg_win_inr)} color="var(--green)" />
          <Kpi label="Avg loss" value={fmtInr(o.avg_loss_inr)} color="var(--red)" />
          <Kpi label="Expectancy / trade" value={fmtInr(o.expectancy_inr)} color={o.expectancy_inr >= 0 ? "var(--green)" : "var(--red)"} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">🧠</span> What the Learning Agent has learned</h2>
        {tips.length === 0 && (
          <div className="banner-info">
            Not enough closed trades yet. The learning system kicks in after ~5 closed trades per setup.
          </div>
        )}
        {tips.map((t, i) => (
          <div key={i} className={`tip tip-${t.kind}`}>
            <span className="tip-kind">{t.kind === "favor" ? "✓ FAVOR" : t.kind === "avoid" ? "✕ AVOID" : "⚖ CALIBRATE"}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">🔬</span> Setup performance</h2>
        {setups.length === 0 && <div className="banner-info">No setup data yet.</div>}
        {setups.length > 0 && (
          <table className="journal-table">
            <thead>
              <tr><th>Setup</th><th>Total</th><th>Closed</th><th>Wins</th><th>Losses</th><th>Win rate</th><th>Avg confidence</th><th>Bar</th></tr>
            </thead>
            <tbody>
              {setups.map((s) => (
                <tr key={s.setup_type}>
                  <td className="setup">{s.setup_type.replace(/_/g, " ")}</td>
                  <td>{s.total}</td>
                  <td>{s.closed}</td>
                  <td className="pos">{s.wins}</td>
                  <td className="neg">{s.losses}</td>
                  <td className={s.win_rate >= 60 ? "pos" : s.win_rate < 40 ? "neg" : ""}>{s.win_rate == null ? "—" : `${s.win_rate}%`}</td>
                  <td>{s.avg_confidence}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${s.win_rate || 0}%`, background: s.win_rate >= 60 ? "var(--green)" : s.win_rate < 40 ? "var(--red)" : "var(--amber)" }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2><span className="num">🎯</span> Confidence calibration</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
          Did 70%-confidence recommendations actually win 70% of the time? Each row compares the band's promise vs. its real win rate.
        </p>
        {cal.every((b) => b.total === 0) ? (
          <div className="banner-info">No closed trades yet to calibrate against.</div>
        ) : (
          <table className="journal-table">
            <thead><tr><th>Confidence band</th><th>Closed</th><th>Wins</th><th>Real win rate</th><th>Calibration</th></tr></thead>
            <tbody>
              {cal.map((b) => {
                const mid = (b.min + b.max) / 2;
                const gap = b.win_rate != null ? b.win_rate - mid : null;
                const color = b.win_rate == null ? "var(--muted)" : Math.abs(gap) <= 5 ? "var(--green)" : gap > 0 ? "var(--accent)" : "var(--amber)";
                const txt = b.win_rate == null ? "—" : Math.abs(gap) <= 5 ? "Calibrated ✓" : gap > 0 ? `Under-promised by ${gap.toFixed(0)} pts` : `Over-promised by ${Math.abs(gap).toFixed(0)} pts`;
                return (
                  <tr key={b.range}>
                    <td>{b.range}%</td><td>{b.total}</td><td>{b.wins}</td>
                    <td>{b.win_rate == null ? "—" : `${b.win_rate}%`}</td>
                    <td style={{ color }}>{txt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {dailyPnl.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2><span className="num">📅</span> Daily PnL (last 30 days)</h2>
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

function winColor(wr) {
  if (wr == null) return "var(--muted)";
  if (wr >= 60) return "var(--green)";
  if (wr < 40) return "var(--red)";
  return "var(--amber)";
}

function DailyChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => Math.abs(d.pnl)));
  return (
    <div className="bar-chart">
      {data.map((d) => {
        const pct = max ? (Math.abs(d.pnl) / max) * 100 : 0;
        const color = d.pnl >= 0 ? "var(--green)" : "var(--red)";
        return (
          <div key={d.day} className="bc-col" title={`${d.day}: ₹${d.pnl.toLocaleString("en-IN")} (${d.trades} trades)`}>
            <div className="bc-bar" style={{ height: `${pct}%`, background: color }} />
            <div className="bc-label">{d.day.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

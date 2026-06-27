const scanRows = [
  {
    symbol: "RELIANCE",
    setup: "Pullback near 20 EMA",
    score: 78,
    trend: "Above 50 DMA",
    action: "Watch",
  },
  {
    symbol: "HDFCBANK",
    setup: "Base breakout watch",
    score: 74,
    trend: "Improving RS",
    action: "Review",
  },
  {
    symbol: "INFY",
    setup: "Range breakout pending",
    score: 69,
    trend: "Neutral",
    action: "Wait",
  },
];

const rules = [
  "Close above 20 DMA and 50 DMA",
  "RSI between 55 and 70",
  "Volume above 1.5x 20-day average",
  "Stop loss below swing low or 1.5 ATR",
  "Minimum reward-to-risk of 2:1",
];

export default function SwingTrading({ snapshot }) {
  const marketLabel = snapshot?.market_status?.label || "Checking market";

  return (
    <div className="page-stack">
      <section className="mission-banner compact">
        <div className="mission-copy">
          <div className="section-kicker">Swing Trading Workspace</div>
          <h3>Scan stocks, score setups, and prepare multi-day positions.</h3>
          <p>
            This workspace is separated from intraday options so the user flow stays clean. It is built for 3-day to 4-week setups using trend, momentum, volume, relative strength, and risk-reward checks.
          </p>
        </div>
        <div className="mission-stats">
          <div className="mission-stat">
            <span className="mission-stat-label">Market State</span>
            <strong>{marketLabel}</strong>
            <span className="mission-stat-detail">Used as regime filter</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Universe</span>
            <strong>NIFTY 200</strong>
            <span className="mission-stat-detail">Default swing scan universe</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Holding Period</span>
            <strong>3D - 4W</strong>
            <span className="mission-stat-detail">Multi-day setup window</span>
          </div>
        </div>
      </section>

      <section className="grid analyzer-grid">
        <div className="stack-col">
          <div className="card">
            <h2><span className="num">1</span> Scanner Controls</h2>
            <div className="field">
              <label>Universe</label>
              <select className="cell-select" defaultValue="nifty200">
                <option value="nifty200">NIFTY 200</option>
                <option value="nifty100">NIFTY 100</option>
                <option value="watchlist">My Watchlist</option>
              </select>
              <span className="field-hint">Backend API hook: GET /api/swing/scan</span>
            </div>
            <div className="field">
              <label>Setup Type</label>
              <select className="cell-select" defaultValue="all">
                <option value="all">All setups</option>
                <option value="breakout">Breakout</option>
                <option value="pullback">20 EMA Pullback</option>
                <option value="base">Base Breakout</option>
              </select>
            </div>
            <button className="btn-primary" type="button" disabled>
              Scanner API coming next
            </button>
          </div>

          <div className="card">
            <h2><span className="num">2</span> Setup Rules</h2>
            <ul className="adv-bullets">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </div>
        </div>

        <div className="stack-col">
          <div className="card">
            <h2><span className="num">3</span> Swing Scan Preview</h2>
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Setup</th>
                    <th>Score</th>
                    <th>Trend</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scanRows.map((row) => (
                    <tr key={row.symbol}>
                      <td><span className="cell-main">{row.symbol}</span></td>
                      <td>{row.setup}</td>
                      <td><span className={row.score >= 75 ? "cell-pos" : "cell-warn"}>{row.score}</span></td>
                      <td>{row.trend}</td>
                      <td>{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2><span className="num">4</span> Backend Architecture</h2>
            <div className="kv-grid">
              <div className="kv-item">
                <span className="k">Universe API</span>
                <span className="v">/api/swing/universe</span>
              </div>
              <div className="kv-item">
                <span className="k">Scanner API</span>
                <span className="v">/api/swing/scan</span>
              </div>
              <div className="kv-item">
                <span className="k">Stock Detail</span>
                <span className="v">/api/swing/:symbol</span>
              </div>
              <div className="kv-item">
                <span className="k">Journal</span>
                <span className="v">/api/swing/journal</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

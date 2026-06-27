import { useEffect, useState } from "react";
import EditableCell from "../components/EditableCell.jsx";

const OUTCOMES = [
  { key: "OPEN", label: "Open" },
  { key: "TARGET1_HIT", label: "Target 1" },
  { key: "TARGET2_HIT", label: "Target 2" },
  { key: "SL_HIT", label: "Stop loss" },
  { key: "MANUAL_EXIT", label: "Manual exit" },
  { key: "SKIPPED", label: "Skipped" },
];

function fmtInr(value) {
  if (value == null) return "--";
  const number = Number(value);
  const sign = number < 0 ? "-" : "";
  return `${sign}₹${Math.abs(number).toLocaleString("en-IN")}`;
}

export default function Journal() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  async function load() {
    const instrument = filter === "ALL" ? "" : `?instrument=${filter}`;
    const response = await fetch(`/api/journal${instrument}`);
    const data = await response.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function patchRow(id, patch) {
    await fetch(`/api/journal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteRow(id) {
    if (!confirm("Delete this recommendation?")) return;
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    await load();
  }

  const openTrades = items.filter((row) => !row.outcome || row.outcome === "OPEN").length;
  const pnlTracked = items.reduce((sum, row) => sum + (Number(row.pnl_inr) || 0), 0);

  return (
    <div className="page-stack">
      <section className="mission-banner compact">
        <div className="mission-copy">
          <div className="section-kicker">Review loop</div>
          <h3>Compare the plan, the execution, and the realised outcome.</h3>
          <p>
            The journal is where recommendation quality turns into learning. Edit the actual fills, note execution mistakes, and keep the learning agent grounded in what really happened.
          </p>
        </div>
        <div className="mission-stats">
          <div className="mission-stat">
            <span className="mission-stat-label">Recommendations</span>
            <strong>{total}</strong>
            <span className="mission-stat-detail">Stored trade records</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Open trades</span>
            <strong>{openTrades}</strong>
            <span className="mission-stat-detail">Still awaiting final outcome</span>
          </div>
          <div className="mission-stat">
            <span className="mission-stat-label">Tracked PnL</span>
            <strong>{fmtInr(pnlTracked)}</strong>
            <span className="mission-stat-detail">Based on actual fills</span>
          </div>
        </div>
      </section>

      <div className="card" style={{ marginTop: 8 }}>
        <h2><span className="num">J</span> Trade journal</h2>

        <div className="journal-controls">
          <div className="toggle-row" style={{ maxWidth: 360 }}>
            {["ALL", "NIFTY", "BANKNIFTY"].map((value) => (
              <button key={value} className={`toggle ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>
                {value}
              </button>
            ))}
          </div>
          <div className="journal-help">
            Click any dotted field to edit actual lots, entry, exit, or notes. PnL auto-recomputes from actual entry x actual exit x lots.
          </div>
        </div>

        {items.length === 0 && (
          <div className="banner-info" style={{ marginTop: 12 }}>
            No trades logged yet. Run an analysis in the Analyzer workspace and each recommendation will appear here automatically.
          </div>
        )}

        {items.length > 0 && (
          <div className="journal-table-wrap">
            <table className="journal-table editable">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Instrument</th>
                  <th>Setup</th>
                  <th>Contract</th>
                  <th title="What the AI recommended">AI lots</th>
                  <th title="How many lots you actually bought">Your lots</th>
                  <th title="Actual entry premium">Your entry</th>
                  <th title="Actual exit premium">Your exit</th>
                  <th>Outcome</th>
                  <th>PnL</th>
                  <th>Conf</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className={row.decision === "NO_TRADE" ? "row-no-trade" : ""}>
                    <td className="ts">{new Date(row.created_at).toLocaleString("en-IN", { hour12: false })}</td>
                    <td><span className="badge instrument">{row.instrument}</span></td>
                    <td className="setup">{row.setup_type || "--"}</td>
                    <td>
                      <div>{row.contract || "--"}</div>
                      {row.entry_low && (
                        <div className="cell-sub">AI: ₹{row.entry_low}-{row.entry_high} | SL ₹{row.stop_loss} | T1 ₹{row.target_1} | T2 ₹{row.target_2}</div>
                      )}
                    </td>
                    <td className="ai-val">{row.lots ?? "--"}</td>
                    <td>
                      <EditableCell
                        type="number"
                        step="1"
                        value={row.actual_lots}
                        onSave={(value) => patchRow(row.id, { actual_lots: value })}
                        placeholder="--"
                      />
                    </td>
                    <td>
                      <EditableCell
                        type="number"
                        step="0.05"
                        prefix="₹"
                        value={row.actual_entry}
                        onSave={(value) => patchRow(row.id, { actual_entry: value })}
                        placeholder="--"
                      />
                    </td>
                    <td>
                      <EditableCell
                        type="number"
                        step="0.05"
                        prefix="₹"
                        value={row.actual_exit}
                        onSave={(value) => patchRow(row.id, { actual_exit: value })}
                        placeholder="--"
                      />
                    </td>
                    <td>
                      <select className="cell-select" value={row.outcome || "OPEN"} onChange={(event) => patchRow(row.id, { outcome: event.target.value })}>
                        {OUTCOMES.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={row.pnl_inr > 0 ? "pos" : row.pnl_inr < 0 ? "neg" : ""}>
                      <EditableCell
                        type="number"
                        step="100"
                        value={row.pnl_inr}
                        onSave={(value) => patchRow(row.id, { pnl_inr: value })}
                        format={(value) => Math.abs(value).toLocaleString("en-IN")}
                        prefix={row.pnl_inr < 0 ? "-₹" : "₹"}
                        placeholder="auto"
                      />
                    </td>
                    <td>{row.confidence_adj ?? row.confidence_raw ?? "--"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="row-btn" onClick={() => setExpanded(expanded === row.id ? null : row.id)} title="Details">
                          {expanded === row.id ? "^" : "v"}
                        </button>
                        <button className="row-btn danger" onClick={() => deleteRow(row.id)} title="Delete">
                          x
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expanded && (() => {
              const row = items.find((item) => item.id === expanded);
              if (!row) return null;

              const lotSize = row.lot_size || (row.instrument === "BANKNIFTY" ? 30 : 75);
              const aiPnl = row.actual_exit != null && row.actual_entry != null
                ? Math.round((row.actual_exit - row.actual_entry) * lotSize * (row.actual_lots || row.lots || 0))
                : null;

              return (
                <div className="row-expand">
                  <div className="row-expand-grid">
                    <div>
                      <div className="exp-title">Recommendation vs execution</div>
                      <div className="vs-grid">
                        <div className="vs-cell">
                          <div className="vs-k">AI lots x entry</div>
                          <div className="vs-v">{row.lots ?? "--"} x ₹{row.entry_low ?? "?"}-{row.entry_high ?? "?"}</div>
                        </div>
                        <div className="vs-cell">
                          <div className="vs-k">Your lots x entry</div>
                          <div className="vs-v">{row.actual_lots ?? "--"} x ₹{row.actual_entry ?? "--"}</div>
                        </div>
                        <div className="vs-cell">
                          <div className="vs-k">AI risk to reward</div>
                          <div className="vs-v">₹{row.risk_inr ?? "?"} to ₹{row.reward_inr ?? "?"} (1:{row.rr_ratio})</div>
                        </div>
                        <div className="vs-cell">
                          <div className="vs-k">Your actual PnL</div>
                          <div className="vs-v" style={{ color: (row.pnl_inr ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>{fmtInr(row.pnl_inr)}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="exp-title">Invalidation</div>
                      <div className="exp-val">{row.invalid_condition || "--"}</div>
                      <div className="exp-title" style={{ marginTop: 14 }}>Mistake reason</div>
                      <textarea
                        className="exp-textarea"
                        defaultValue={row.mistake_reason || ""}
                        placeholder="For example: entered late, moved stop, took profit early"
                        onBlur={(event) => patchRow(row.id, { mistake_reason: event.target.value })}
                      />
                    </div>

                    <div>
                      <div className="exp-title">Your notes</div>
                      <textarea
                        className="exp-textarea"
                        defaultValue={row.user_note || ""}
                        placeholder="Free-form notes that feed the learning agent"
                        onBlur={(event) => patchRow(row.id, { user_note: event.target.value })}
                      />
                      {aiPnl != null && aiPnl !== row.pnl_inr && (
                        <button
                          className="recompute-btn"
                          onClick={() => patchRow(row.id, {
                            pnl_inr: null,
                            actual_lots: row.actual_lots,
                            actual_entry: row.actual_entry,
                            actual_exit: row.actual_exit,
                          })}
                        >
                          Recompute PnL as {fmtInr(aiPnl)}
                        </button>
                      )}
                    </div>
                  </div>

                  <details className="details" style={{ marginTop: 10 }}>
                    <summary>Stored strategist JSON</summary>
                    <pre>{tryFormatJson(row.strategist_json)}</pre>
                  </details>
                  <details className="details">
                    <summary>Explanation</summary>
                    <pre>{tryFormatJson(row.explanation)}</pre>
                  </details>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function tryFormatJson(value) {
  if (value == null) return "--";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

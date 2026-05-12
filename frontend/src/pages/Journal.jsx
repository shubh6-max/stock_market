import { useEffect, useState } from "react";

const OUTCOMES = [
  { key: "TARGET1_HIT", label: "🎯 T1", className: "green" },
  { key: "TARGET2_HIT", label: "🎯🎯 T2", className: "green" },
  { key: "SL_HIT", label: "⛔ SL", className: "red" },
  { key: "MANUAL_EXIT", label: "↩ Manual", className: "amber" },
  { key: "SKIPPED", label: "⤬ Skipped", className: "ghost" },
];

function fmtInr(n) {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

function outcomeBadge(o) {
  if (!o) return <span className="badge muted">Open</span>;
  const cls = o.startsWith("TARGET") ? "green" : o === "SL_HIT" ? "red" : o === "MANUAL_EXIT" ? "amber" : "muted";
  return <span className={`badge ${cls}`}>{o.replace("_", " ")}</span>;
}

export default function Journal() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    const inst = filter === "ALL" ? "" : `?instrument=${filter}`;
    const r = await fetch(`/api/journal${inst}`);
    const d = await r.json();
    setItems(d.items || []);
    setTotal(d.total || 0);
  }

  useEffect(() => { load(); }, [filter]);

  async function markResult(id, outcome) {
    setBusy(true);
    await fetch(`/api/journal/${id}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, pnl_inr: defaultPnlForOutcome(outcome) }),
    });
    await load();
    setBusy(false);
  }

  async function deleteRow(id) {
    if (!confirm("Delete this recommendation?")) return;
    setBusy(true);
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    await load();
    setBusy(false);
  }

  function defaultPnlForOutcome(o) {
    // Calculated client-side from the rec when marking; the row holds risk_inr / reward_inr
    return null;
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <h2><span className="num">📓</span> Trade Journal — {total} total</h2>

      <div className="journal-controls">
        <div className="toggle-row" style={{ maxWidth: 360 }}>
          {["ALL", "NIFTY", "BANKNIFTY"].map((f) => (
            <button key={f} className={`toggle ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="banner-info" style={{ marginTop: 12 }}>
          No trades logged yet. Run an analysis on the Analyzer tab — every recommendation is saved here.
        </div>
      )}

      {items.length > 0 && (
        <div className="journal-table-wrap">
          <table className="journal-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Instrument</th>
                <th>Setup</th>
                <th>Decision</th>
                <th>Contract</th>
                <th>Entry</th>
                <th>SL → T1 / T2</th>
                <th>Lots</th>
                <th>Conf</th>
                <th>Outcome</th>
                <th>PnL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={row.decision === "NO_TRADE" ? "row-no-trade" : ""}>
                  <td className="ts">{new Date(row.created_at).toLocaleString("en-IN", { hour12: false })}</td>
                  <td><span className="badge instrument">{row.instrument}</span></td>
                  <td className="setup">{row.setup_type || "—"}</td>
                  <td>{row.decision === "NO_TRADE" ? <span className="badge muted">No trade</span> : <span className="badge accent">{row.option_type}</span>}</td>
                  <td>{row.contract || "—"}</td>
                  <td>{row.entry_low ? `₹${row.entry_low}–${row.entry_high}` : "—"}</td>
                  <td>{row.stop_loss ? `₹${row.stop_loss} → ₹${row.target_1} / ₹${row.target_2}` : "—"}</td>
                  <td>{row.lots || "—"}</td>
                  <td>{row.confidence_adj ?? row.confidence_raw ?? "—"}</td>
                  <td>{outcomeBadge(row.outcome)}</td>
                  <td className={row.pnl_inr > 0 ? "pos" : row.pnl_inr < 0 ? "neg" : ""}>{fmtInr(row.pnl_inr)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? "▲" : "▼"}</button>
                      <button className="row-btn danger" onClick={() => deleteRow(row.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {expanded && (() => {
            const row = items.find((r) => r.id === expanded);
            if (!row) return null;
            return (
              <div className="row-expand">
                <div className="row-expand-grid">
                  <div>
                    <div className="exp-title">Mark outcome</div>
                    <div className="qm-row">
                      {OUTCOMES.map((o) => (
                        <button key={o.key} className={`qm-btn ${o.className}`} disabled={busy} onClick={() => markResult(row.id, o.key)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="exp-title">Invalidation</div>
                    <div className="exp-val">{row.invalid_condition || "—"}</div>
                  </div>
                  <div>
                    <div className="exp-title">Risk / Reward</div>
                    <div className="exp-val">Risk {fmtInr(row.risk_inr)} → Reward {fmtInr(row.reward_inr)}  ·  RR 1:{row.rr_ratio}</div>
                  </div>
                </div>
                <details className="details" style={{ marginTop: 10 }}>
                  <summary>📜 Stored strategist JSON</summary>
                  <pre>{tryFormatJson(row.strategist_json)}</pre>
                </details>
                <details className="details">
                  <summary>📊 Stored chart analysis</summary>
                  <pre>{tryFormatJson(row.chart_analysis)}</pre>
                </details>
                <details className="details">
                  <summary>💬 Explanation</summary>
                  <pre>{tryFormatJson(row.explanation)}</pre>
                </details>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function tryFormatJson(v) {
  if (v == null) return "—";
  if (typeof v === "string") {
    try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
  }
  return JSON.stringify(v, null, 2);
}

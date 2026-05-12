import { useEffect, useState } from "react";
import EditableCell from "../components/EditableCell.jsx";

const OUTCOMES = [
  { key: "OPEN", label: "Open", className: "muted" },
  { key: "TARGET1_HIT", label: "🎯 T1", className: "green" },
  { key: "TARGET2_HIT", label: "🎯🎯 T2", className: "green" },
  { key: "SL_HIT", label: "⛔ SL", className: "red" },
  { key: "MANUAL_EXIT", label: "↩ Manual", className: "amber" },
  { key: "SKIPPED", label: "⤬ Skipped", className: "ghost" },
];

function fmtInr(n) {
  if (n == null) return "—";
  const v = Number(n);
  const sign = v < 0 ? "−" : "";
  return sign + "₹" + Math.abs(v).toLocaleString("en-IN");
}

function outcomeBadge(o) {
  if (!o || o === "OPEN") return <span className="badge muted">Open</span>;
  const cls = o.startsWith("TARGET") ? "green" : o === "SL_HIT" ? "red" : o === "MANUAL_EXIT" ? "amber" : "muted";
  return <span className={`badge ${cls}`}>{o.replace("_", " ")}</span>;
}

export default function Journal() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  async function load() {
    const inst = filter === "ALL" ? "" : `?instrument=${filter}`;
    const r = await fetch(`/api/journal${inst}`);
    const d = await r.json();
    setItems(d.items || []);
    setTotal(d.total || 0);
  }

  useEffect(() => { load(); }, [filter]);

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

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <h2><span className="num">📓</span> Trade Journal — {total} total</h2>

      <div className="journal-controls">
        <div className="toggle-row" style={{ maxWidth: 360 }}>
          {["ALL", "NIFTY", "BANKNIFTY"].map((f) => (
            <button key={f} className={`toggle ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="journal-help">
          ✎ Click any cell with a dotted underline to edit. PnL auto-computes from actual entry × actual exit × lots.
        </div>
      </div>

      {items.length === 0 && (
        <div className="banner-info" style={{ marginTop: 12 }}>
          No trades logged yet. Run an analysis on the Analyzer tab — every recommendation is saved here.
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
                <th title="What the AI recommended">AI Lots</th>
                <th title="How many lots you actually bought">Your Lots</th>
                <th title="Actual entry premium">Your Entry</th>
                <th title="Actual exit premium">Your Exit</th>
                <th>Outcome</th>
                <th>PnL</th>
                <th>Conf</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const lotSize = row.lot_size || (row.instrument === "BANKNIFTY" ? 30 : 75);
                return (
                  <tr key={row.id} className={row.decision === "NO_TRADE" ? "row-no-trade" : ""}>
                    <td className="ts">{new Date(row.created_at).toLocaleString("en-IN", { hour12: false })}</td>
                    <td><span className="badge instrument">{row.instrument}</span></td>
                    <td className="setup">{row.setup_type || "—"}</td>
                    <td>
                      <div>{row.contract || "—"}</div>
                      {row.entry_low && (
                        <div className="cell-sub">AI: ₹{row.entry_low}–{row.entry_high} → SL ₹{row.stop_loss} / T1 ₹{row.target_1} / T2 ₹{row.target_2}</div>
                      )}
                    </td>
                    <td className="ai-val">{row.lots ?? "—"}</td>
                    <td>
                      <EditableCell
                        type="number" step="1"
                        value={row.actual_lots}
                        onSave={(v) => patchRow(row.id, { actual_lots: v })}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <EditableCell
                        type="number" step="0.05"
                        prefix="₹"
                        value={row.actual_entry}
                        onSave={(v) => patchRow(row.id, { actual_entry: v })}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <EditableCell
                        type="number" step="0.05"
                        prefix="₹"
                        value={row.actual_exit}
                        onSave={(v) => patchRow(row.id, { actual_exit: v })}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <select
                        className="cell-select"
                        value={row.outcome || "OPEN"}
                        onChange={(e) => patchRow(row.id, { outcome: e.target.value })}
                      >
                        {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className={row.pnl_inr > 0 ? "pos" : row.pnl_inr < 0 ? "neg" : ""}>
                      <EditableCell
                        type="number" step="100"
                        value={row.pnl_inr}
                        onSave={(v) => patchRow(row.id, { pnl_inr: v })}
                        format={(v) => Math.abs(v).toLocaleString("en-IN")}
                        prefix={row.pnl_inr < 0 ? "−₹" : "₹"}
                        placeholder="auto"
                      />
                    </td>
                    <td>{row.confidence_adj ?? row.confidence_raw ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="row-btn" onClick={() => setExpanded(expanded === row.id ? null : row.id)} title="Details">{expanded === row.id ? "▲" : "▼"}</button>
                        <button className="row-btn danger" onClick={() => deleteRow(row.id)} title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {expanded && (() => {
            const row = items.find((r) => r.id === expanded);
            if (!row) return null;
            const lotSize = row.lot_size || (row.instrument === "BANKNIFTY" ? 30 : 75);
            const aiPnl = row.actual_exit != null && row.actual_entry != null
              ? Math.round((row.actual_exit - row.actual_entry) * lotSize * (row.actual_lots || row.lots || 0))
              : null;

            return (
              <div className="row-expand">
                <div className="row-expand-grid">
                  <div>
                    <div className="exp-title">AI recommendation vs your trade</div>
                    <div className="vs-grid">
                      <div className="vs-cell">
                        <div className="vs-k">AI lots × entry</div>
                        <div className="vs-v">{row.lots ?? "—"} × ₹{row.entry_low ?? "?"}–{row.entry_high ?? "?"}</div>
                      </div>
                      <div className="vs-cell">
                        <div className="vs-k">Your lots × entry</div>
                        <div className="vs-v">{row.actual_lots ?? "—"} × ₹{row.actual_entry ?? "—"}</div>
                      </div>
                      <div className="vs-cell">
                        <div className="vs-k">AI risk → reward</div>
                        <div className="vs-v">₹{row.risk_inr ?? "?"} → ₹{row.reward_inr ?? "?"} (1:{row.rr_ratio})</div>
                      </div>
                      <div className="vs-cell">
                        <div className="vs-k">Your actual PnL</div>
                        <div className="vs-v" style={{ color: (row.pnl_inr ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>{fmtInr(row.pnl_inr)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="exp-title">Invalidation</div>
                    <div className="exp-val">{row.invalid_condition || "—"}</div>
                    <div className="exp-title" style={{ marginTop: 14 }}>Mistake reason (optional)</div>
                    <textarea
                      className="exp-textarea"
                      defaultValue={row.mistake_reason || ""}
                      placeholder="e.g. entered late, moved SL, took partial profit early…"
                      onBlur={(e) => patchRow(row.id, { mistake_reason: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="exp-title">Your notes</div>
                    <textarea
                      className="exp-textarea"
                      defaultValue={row.user_note || ""}
                      placeholder="Free-form notes — feeds into Learning Agent"
                      onBlur={(e) => patchRow(row.id, { user_note: e.target.value })}
                    />
                    {aiPnl != null && aiPnl !== row.pnl_inr && (
                      <button className="recompute-btn" onClick={() => patchRow(row.id, { pnl_inr: null, actual_lots: row.actual_lots, actual_entry: row.actual_entry, actual_exit: row.actual_exit })}>
                        🔄 Auto-recompute PnL = {fmtInr(aiPnl)}
                      </button>
                    )}
                  </div>
                </div>

                <details className="details" style={{ marginTop: 10 }}>
                  <summary>📜 Stored strategist JSON</summary>
                  <pre>{tryFormatJson(row.strategist_json)}</pre>
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

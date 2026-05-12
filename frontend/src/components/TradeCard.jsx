import { useState } from "react";
import BeginnerView from "./BeginnerView.jsx";
import AdvancedView from "./AdvancedView.jsx";

export default function TradeCard({ explanation, strategist, vision, macro, options, marketCtx, mode, persistedId }) {
  const [marked, setMarked] = useState(null);

  if (explanation?.error) {
    return (
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Trade plan</h2>
        <div className="banner-warning">Explanation parse failed. Raw below.</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{explanation.raw}</pre>
      </div>
    );
  }

  const e = explanation?.data;
  const s = strategist?.data;

  function copySummary() {
    const txt = mode === "ADVANCED"
      ? `${e.headline}\n\n${e.thesis}\n\nContract: ${e.execution?.contract}\nEntry: ${e.execution?.entry_range}\nSL: ₹${e.execution?.sl_premium} | T1: ₹${e.execution?.t1_premium} | T2: ₹${e.execution?.t2_premium}\nLots: ${e.execution?.lots} | RR: 1:${e.execution?.rr}`
      : `${e.headline}\n${e.what_to_buy}\nEntry: ${e.entry_range_simple}\nSL: ${e.stop_loss_simple}\nT1: ${e.target_1_simple}\nT2: ${e.target_2_simple}`;
    navigator.clipboard.writeText(txt);
  }

  async function markResult(outcome) {
    if (!persistedId) return;
    setMarked("saving");
    try {
      const r = await fetch(`/api/journal/${persistedId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (r.ok) setMarked(outcome);
      else setMarked("error");
    } catch { setMarked("error"); }
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2><span className="num">4</span> Trade plan — {mode === "ADVANCED" ? "institutional brief" : "plain English"}</h2>
      <div className="trade">
        {mode === "ADVANCED" ? <AdvancedView e={e} s={s} /> : <BeginnerView e={e} s={s} />}

        <div className="actions-row">
          <button className="action" onClick={copySummary}>📋 Copy summary</button>
          <button className="action" onClick={() => window.print()}>🖨 Print</button>
          {persistedId && (
            <span className="action ghost">Saved to journal · #{persistedId.slice(0, 6)}</span>
          )}
        </div>

        {persistedId && (
          <div className="quick-mark">
            <div className="qm-title">Quick-mark when trade closes:</div>
            <div className="qm-row">
              <button className="qm-btn green" onClick={() => markResult("TARGET1_HIT")} disabled={marked === "saving"}>🎯 T1 hit</button>
              <button className="qm-btn green" onClick={() => markResult("TARGET2_HIT")} disabled={marked === "saving"}>🎯🎯 T2 hit</button>
              <button className="qm-btn red" onClick={() => markResult("SL_HIT")} disabled={marked === "saving"}>⛔ SL hit</button>
              <button className="qm-btn amber" onClick={() => markResult("MANUAL_EXIT")} disabled={marked === "saving"}>↩ Manual exit</button>
              <button className="qm-btn ghost" onClick={() => markResult("SKIPPED")} disabled={marked === "saving"}>⤬ Skipped</button>
            </div>
            {marked && marked !== "saving" && marked !== "error" && (
              <div className="qm-saved">✓ Marked as {marked.replace("_", " ").toLowerCase()}. Full update in the Journal tab.</div>
            )}
            {marked === "error" && <div className="banner-warning">Could not save. Try again.</div>}
          </div>
        )}
      </div>

      <details className="details">
        <summary>📜 Strategist JSON</summary>
        <pre>{JSON.stringify(s, null, 2)}</pre>
      </details>

      <details className="details">
        <summary>📊 Vision Analyst (per chart)</summary>
        <pre>{JSON.stringify(vision, null, 2)}</pre>
      </details>

      <details className="details">
        <summary>📈 Indicators (live)</summary>
        <pre>{JSON.stringify(marketCtx?.instruments, null, 2)}</pre>
      </details>

      <details className="details">
        <summary>🎯 Option chain signal</summary>
        <pre>{JSON.stringify(options, null, 2)}</pre>
      </details>

      <details className="details">
        <summary>🌍 Macro & geopolitical brief</summary>
        <pre>{macro}</pre>
      </details>
    </div>
  );
}

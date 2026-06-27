import { useEffect, useMemo, useState } from "react";

function num(v) {
  if (v == null) return "--";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function MiniLineChart({ title, instrument, interval = "15minute", days = 7 }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    async function load() {
      try {
        const url = `/api/charts/candles?instrument=${encodeURIComponent(instrument)}&interval=${interval}&days=${days}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(data.error || "Data load failed");
        if (!off) setRows(data.candles || []);
      } catch (e) {
        if (!off) setError(e.message);
      }
    }
    load();
    const id = setInterval(load, interval === "day" ? 300000 : 60000);
    return () => { off = true; clearInterval(id); };
  }, [instrument, interval, days]);

  const chart = useMemo(() => {
    const data = rows.slice(-80);
    if (!data.length) return null;
    const w = 720, h = 230, p = 22;
    const min = Math.min(...data.map((d) => d.low));
    const max = Math.max(...data.map((d) => d.high));
    const span = Math.max(1, max - min);
    const x = (i) => p + i * ((w - p * 2) / Math.max(1, data.length - 1));
    const y = (v) => h - p - ((v - min) / span) * (h - p * 2);
    const pts = data.map((d, i) => [x(i), y(d.close)]);
    const path = pts.map((pt, i) => `${i ? "L" : "M"}${pt[0]},${pt[1]}`).join(" ");
    return { w, h, min, max, path, pts, last: data[data.length - 1] };
  }, [rows]);

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div><div className="section-kicker">Chart</div><h3>{title}</h3></div>
        <div className="chart-meta"><span>{interval}</span><strong>{num(chart?.last?.close)}</strong></div>
      </div>
      {error && <div className="banner-warning">{error}</div>}
      {!error && !chart && <div className="chart-empty">Loading chart...</div>}
      {chart && <svg className="price-chart" viewBox={`0 0 ${chart.w} ${chart.h}`}><path d={chart.path} className="chart-line" />{chart.pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === chart.pts.length - 1 ? 4 : 2} className="chart-dot" />)}</svg>}
    </div>
  );
}

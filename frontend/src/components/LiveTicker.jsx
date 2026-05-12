function fmt(n, d = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function pct(n) {
  if (n == null) return "";
  const v = Number(n);
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}
function dir(n) {
  if (n == null) return "";
  return n >= 0 ? "up" : "down";
}

export default function LiveTicker({ snapshot }) {
  if (!snapshot) {
    return (
      <div className="ticker">
        <div className="tick"><span className="dot-live"></span><span className="name">Loading live market…</span></div>
      </div>
    );
  }
  const items = [
    { name: "NIFTY", q: snapshot.nifty },
    { name: "BANKNIFTY", q: snapshot.banknifty },
    { name: "INDIA VIX", q: snapshot.indiavix },
    { name: "USD/INR", q: snapshot.usdinr },
    { name: "DXY", q: snapshot.dxy },
    { name: "BRENT", q: snapshot.crude },
    { name: "US 10Y", q: snapshot.us10y },
  ];
  return (
    <div className="ticker">
      <div className="tick"><span className="dot-live"></span><span className="name" style={{ color: "var(--green)" }}>LIVE</span></div>
      {items.map((it, i) => (
        <div key={i} className="tick">
          <span className="name">{it.name}</span>
          <span className={`val ${dir(it.q?.changePct)}`}>{fmt(it.q?.price)}</span>
          <span className={`chg ${dir(it.q?.changePct)}`}>{pct(it.q?.changePct)}</span>
        </div>
      ))}
    </div>
  );
}

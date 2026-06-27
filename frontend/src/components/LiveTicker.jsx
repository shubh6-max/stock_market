function fmt(value, digits = 2) {
  if (value == null) return "--";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pct(value) {
  if (value == null) return "";
  const number = Number(value);
  const sign = number >= 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function direction(value) {
  if (value == null) return "";
  return value >= 0 ? "up" : "down";
}

export default function LiveTicker({ snapshot }) {
  if (!snapshot) {
    return (
      <div className="ticker">
        <div className="tick">
          <span className="dot-live"></span>
          <span className="name">Loading data...</span>
        </div>
      </div>
    );
  }

  const status = snapshot.market_status;
  const isOpen = status?.state === "live";
  const items = [
    { name: "NIFTY", quote: snapshot.nifty },
    { name: "BANKNIFTY", quote: snapshot.banknifty },
    { name: "INDIA VIX", quote: snapshot.indiavix },
    { name: "USD/INR", quote: snapshot.usdinr },
    { name: "DXY", quote: snapshot.dxy },
    { name: "BRENT", quote: snapshot.crude },
    { name: "US 10Y", quote: snapshot.us10y },
  ];

  return (
    <div className="ticker">
      <div className="tick">
        <span className={isOpen ? "dot-live" : "dot-closed"}></span>
        <span className={`name ${isOpen ? "up" : "closed"}`}>{status?.label || "Status"}</span>
      </div>
      {items.map((item) => (
        <div key={item.name} className="tick">
          <span className="name">{item.name}</span>
          <span className={`val ${direction(item.quote?.changePct)}`}>{fmt(item.quote?.price)}</span>
          <span className={`chg ${direction(item.quote?.changePct)}`}>{pct(item.quote?.changePct)}</span>
        </div>
      ))}
    </div>
  );
}

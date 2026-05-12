function fmt(n, d = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function MarketContext({ market, snapshot, instrument }) {
  if (!market) return null;
  const ind = market.indicators || {};
  const key = instrument.toLowerCase();
  const spot = snapshot?.[key];

  const chips = [
    { k: "Spot", v: fmt(spot?.price), up: (spot?.changePct ?? 0) >= 0 },
    { k: "Trend", v: ind.trend_label?.replace("_", " ") || "—" },
    { k: "RSI(14)", v: ind.rsi_14 != null ? ind.rsi_14.toFixed(1) : "—" },
    { k: "VWAP", v: fmt(ind.vwap), up: ind.above_vwap },
    { k: "Pivot", v: fmt(ind.cpr?.pivot) },
    { k: "ATR", v: fmt(ind.atr_14) },
    { k: "Supertrend", v: ind.supertrend?.trend || "—" },
    { k: "PCR", v: market.pcr != null ? market.pcr.toFixed(2) : "n/a" },
    { k: "Max Pain", v: market.max_pain ?? "n/a" },
  ];

  return (
    <div className="market-strip">
      {chips.map((c, i) => (
        <div key={i} className={`market-chip ${c.up === true ? "up" : c.up === false ? "down" : ""}`}>
          <span className="k">{c.k}</span>
          <span className="v">{c.v}</span>
        </div>
      ))}
    </div>
  );
}

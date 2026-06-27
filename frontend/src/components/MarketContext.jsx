function fmt(value, digits = 2) {
  if (value == null) return "--";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function MarketContext({ market, snapshot, instrument }) {
  if (!market) return null;

  const indicators = market.indicators || {};
  const key = instrument.toLowerCase();
  const spot = snapshot?.[key];

  const chips = [
    { k: "Spot", v: fmt(spot?.price), up: (spot?.changePct ?? 0) >= 0 },
    { k: "Trend", v: indicators.trend_label?.replace("_", " ") || "--" },
    { k: "RSI(14)", v: indicators.rsi_14 != null ? indicators.rsi_14.toFixed(1) : "--" },
    { k: "VWAP", v: fmt(indicators.vwap), up: indicators.above_vwap },
    { k: "Pivot", v: fmt(indicators.cpr?.pivot) },
    { k: "ATR", v: fmt(indicators.atr_14) },
    { k: "Supertrend", v: indicators.supertrend?.trend || "--" },
    { k: "PCR", v: market.pcr != null ? market.pcr.toFixed(2) : "n/a" },
    { k: "Max Pain", v: market.max_pain ?? "n/a" },
  ];

  return (
    <div className="market-strip">
      {chips.map((chip, index) => (
        <div key={index} className={`market-chip ${chip.up === true ? "up" : chip.up === false ? "down" : ""}`}>
          <span className="k">{chip.k}</span>
          <span className="v">{chip.v}</span>
        </div>
      ))}
    </div>
  );
}

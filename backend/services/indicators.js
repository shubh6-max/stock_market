// Deterministic technical indicators. No LLM involvement.
// All inputs are arrays of {open, high, low, close, volume, time}

export function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

export function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgG = gains / period, avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );
    trs.push(tr);
  }
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period;
  return a;
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return null;
  const macdLine = [];
  for (let i = slow - 1; i < closes.length; i++) {
    const f = ema(closes.slice(0, i + 1), fast);
    const s = ema(closes.slice(0, i + 1), slow);
    macdLine.push(f - s);
  }
  const sig = ema(macdLine, signal);
  const m = macdLine[macdLine.length - 1];
  return { macd: m, signal: sig, hist: m - sig };
}

// VWAP for the current trading day given intraday candles
export function intradayVWAP(candles) {
  if (!candles.length) return null;
  const todayStr = new Date(candles[candles.length - 1].time).toDateString();
  const today = candles.filter((c) => new Date(c.time).toDateString() === todayStr);
  let pv = 0, vol = 0;
  for (const c of today) {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * (c.volume || 1);
    vol += c.volume || 1;
  }
  return vol === 0 ? null : pv / vol;
}

// Opening range (first 30 mins = first 2x 15m candles after open)
export function openingRange(candles) {
  if (!candles.length) return null;
  const todayStr = new Date(candles[candles.length - 1].time).toDateString();
  const today = candles.filter((c) => new Date(c.time).toDateString() === todayStr);
  if (today.length < 2) return null;
  const or = today.slice(0, 2);
  return {
    high: Math.max(...or.map((c) => c.high)),
    low: Math.min(...or.map((c) => c.low)),
  };
}

// Central Pivot Range based on previous day OHLC
export function cpr(prevDay) {
  if (!prevDay) return null;
  const { high, low, close } = prevDay;
  const pivot = (high + low + close) / 3;
  const bc = (high + low) / 2;
  const tc = pivot + (pivot - bc);
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);
  return { pivot, bc, tc, r1, r2, r3, s1, s2, s3, width: Math.abs(tc - bc) };
}

export function supertrend(candles, period = 10, multiplier = 3) {
  if (candles.length < period + 1) return null;
  const a = atr(candles, period);
  if (a == null) return null;
  const last = candles[candles.length - 1];
  const hl2 = (last.high + last.low) / 2;
  const upper = hl2 + multiplier * a;
  const lower = hl2 - multiplier * a;
  const trend = last.close > upper ? "UP" : last.close < lower ? "DOWN" : "NEUTRAL";
  return { upper, lower, trend, atr: a };
}

export function computeAll(candles15m, dailyCandles) {
  const closes = candles15m.map((c) => c.close);
  const prevDay = dailyCandles.length >= 2 ? dailyCandles[dailyCandles.length - 2] : null;
  const last = candles15m[candles15m.length - 1];
  const cprData = cpr(prevDay);
  const vwap = intradayVWAP(candles15m);
  const or = openingRange(candles15m);
  const st = supertrend(candles15m);
  const a14 = atr(candles15m, 14);
  const rsi14 = rsi(closes, 14);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const macdData = macd(closes);

  const trend =
    ema9 && ema21 && ema50
      ? ema9 > ema21 && ema21 > ema50
        ? "STRONG_UP"
        : ema9 < ema21 && ema21 < ema50
        ? "STRONG_DOWN"
        : ema9 > ema21
        ? "WEAK_UP"
        : "WEAK_DOWN"
      : "UNKNOWN";

  // Levels above/below current price
  const lvls = [];
  if (cprData) lvls.push(
    { name: "Pivot", v: cprData.pivot },
    { name: "BC", v: cprData.bc },
    { name: "TC", v: cprData.tc },
    { name: "R1", v: cprData.r1 },
    { name: "R2", v: cprData.r2 },
    { name: "R3", v: cprData.r3 },
    { name: "S1", v: cprData.s1 },
    { name: "S2", v: cprData.s2 },
    { name: "S3", v: cprData.s3 },
  );
  if (or) lvls.push({ name: "ORH", v: or.high }, { name: "ORL", v: or.low });
  if (vwap) lvls.push({ name: "VWAP", v: vwap });

  const price = last?.close;
  const nearestAbove = lvls.filter((l) => l.v > price).sort((a, b) => a.v - b.v)[0] || null;
  const nearestBelow = lvls.filter((l) => l.v < price).sort((a, b) => b.v - a.v)[0] || null;

  return {
    last_price: price,
    last_candle_time: last?.time,
    rsi_14: round(rsi14),
    ema_9: round(ema9),
    ema_21: round(ema21),
    ema_50: round(ema50),
    macd: macdData ? { macd: round(macdData.macd), signal: round(macdData.signal), hist: round(macdData.hist) } : null,
    atr_14: round(a14),
    vwap: round(vwap),
    opening_range: or ? { high: round(or.high), low: round(or.low) } : null,
    cpr: cprData
      ? Object.fromEntries(Object.entries(cprData).map(([k, v]) => [k, round(v)]))
      : null,
    supertrend: st ? { trend: st.trend, upper: round(st.upper), lower: round(st.lower) } : null,
    trend_label: trend,
    above_vwap: vwap ? price > vwap : null,
    price_vs_pivot:
      cprData
        ? price > cprData.tc
          ? "ABOVE_CPR"
          : price < cprData.bc
          ? "BELOW_CPR"
          : "INSIDE_CPR"
        : null,
    nearest_resistance: nearestAbove ? { name: nearestAbove.name, level: round(nearestAbove.v), distance: round(nearestAbove.v - price) } : null,
    nearest_support: nearestBelow ? { name: nearestBelow.name, level: round(nearestBelow.v), distance: round(price - nearestBelow.v) } : null,
  };
}

function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  return Number(n.toFixed(d));
}

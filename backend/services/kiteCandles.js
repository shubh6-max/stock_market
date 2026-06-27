import { kiteHistorical, kiteOhlc } from "./kiteConnect.js";

const KNOWN_TOKENS = {
  "NSE:NIFTY 50": 256265,
  "NSE:NIFTY BANK": 260105,
  "NSE:INDIA VIX": 264969,
};

const INTERVALS = new Set(["minute", "3minute", "5minute", "10minute", "15minute", "30minute", "60minute", "day"]);

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtDate(date, includeTime = true) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  if (!includeTime) return `${y}-${m}-${d}`;
  return `${y}-${m}-${d} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function rangeFor(days, interval) {
  const to = new Date();
  const from = new Date(to.getTime() - Number(days || 30) * 24 * 60 * 60 * 1000);
  return {
    from: fmtDate(from, interval !== "day"),
    to: fmtDate(to, interval !== "day"),
  };
}

export async function resolveInstrumentToken(instrument) {
  const symbol = String(instrument || "").trim();
  if (!symbol) throw new Error("instrument is required");
  if (/^\d+$/.test(symbol)) return Number(symbol);
  if (KNOWN_TOKENS[symbol]) return KNOWN_TOKENS[symbol];

  const data = await kiteOhlc([symbol]);
  const token = data?.[symbol]?.instrument_token;
  if (!token) throw new Error(`Could not resolve Kite instrument token for ${symbol}`);
  return token;
}

function normalizeCandle(row) {
  const [time, open, high, low, close, volume, oi] = row;
  return {
    time,
    open,
    high,
    low,
    close,
    volume: volume || 0,
    oi: oi || null,
  };
}

export async function getKiteCandles({ instrument, interval = "day", days = 220, from, to, oi = 0 }) {
  const resolvedInterval = INTERVALS.has(interval) ? interval : "day";
  const token = await resolveInstrumentToken(instrument);
  const range = from && to ? { from, to } : rangeFor(days, resolvedInterval);
  const data = await kiteHistorical({
    instrumentToken: token,
    interval: resolvedInterval,
    from: range.from,
    to: range.to,
    oi,
  });

  return {
    instrument,
    instrument_token: token,
    interval: resolvedInterval,
    from: range.from,
    to: range.to,
    candles: (data?.candles || []).map(normalizeCandle),
  };
}

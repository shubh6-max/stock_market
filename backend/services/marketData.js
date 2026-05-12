import yahooFinance from "yahoo-finance2";

yahooFinance.suppressNotices?.(["yahooSurvey"]);

const SYMBOLS = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  VIX: "^INDIAVIX",
  USDINR: "INR=X",
  DXY: "DX-Y.NYB",
  CRUDE_WTI: "CL=F",
  CRUDE_BRENT: "BZ=F",
  US10Y: "^TNX",
  SGX_NIFTY: "^NSEI",
};

export async function getSpotQuote(symbol) {
  try {
    const q = await yahooFinance.quote(symbol);
    return {
      symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      dayHigh: q.regularMarketDayHigh,
      dayLow: q.regularMarketDayLow,
      prevClose: q.regularMarketPreviousClose,
      open: q.regularMarketOpen,
      time: q.regularMarketTime,
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

export async function get15mCandles(symbol, days = 5) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    const res = await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "15m",
    });
    const quotes = res?.quotes || [];
    return quotes
      .filter((c) => c.close != null && c.open != null)
      .map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      }));
  } catch (e) {
    return [];
  }
}

export async function getDailyCandles(symbol, days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    const res = await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "1d",
    });
    const quotes = res?.quotes || [];
    return quotes
      .filter((c) => c.close != null)
      .map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      }));
  } catch (e) {
    return [];
  }
}

export async function getDashboardSnapshot() {
  const targets = [
    ["nifty", SYMBOLS.NIFTY],
    ["banknifty", SYMBOLS.BANKNIFTY],
    ["indiavix", SYMBOLS.VIX],
    ["usdinr", SYMBOLS.USDINR],
    ["dxy", SYMBOLS.DXY],
    ["crude", SYMBOLS.CRUDE_BRENT],
    ["us10y", SYMBOLS.US10Y],
  ];
  const results = await Promise.all(targets.map(([_, sym]) => getSpotQuote(sym)));
  const out = {};
  targets.forEach(([key], i) => { out[key] = results[i]; });
  out.timestamp = new Date().toISOString();
  return out;
}

export function symbolFor(instrument) {
  const k = (instrument || "NIFTY").toUpperCase();
  return SYMBOLS[k] || SYMBOLS.NIFTY;
}

export { SYMBOLS };

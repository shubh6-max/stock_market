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
    return mapQuoteToSpot(symbol, q);
  } catch (e) {
    console.warn(`[market] quote ${symbol} failed: ${e.message}`);
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
    const candles = quotes
      .filter((c) => c.close != null && c.open != null)
      .map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      }));
    if (candles.length === 0) console.warn(`[market] 15m candles for ${symbol}: empty response`);
    return candles;
  } catch (e) {
    console.warn(`[market] 15m candles ${symbol} failed: ${e.message}`);
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
    const candles = quotes
      .filter((c) => c.close != null)
      .map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      }));
    if (candles.length === 0) console.warn(`[market] daily candles for ${symbol}: empty response`);
    return candles;
  } catch (e) {
    console.warn(`[market] daily candles ${symbol} failed: ${e.message}`);
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
  const out = {};

  try {
    const symbols = targets.map(([_, symbol]) => symbol);
    const quotes = await yahooFinance.quote(symbols, { return: "object" });

    targets.forEach(([key, symbol]) => {
      const quote = quotes?.[symbol];
      out[key] = quote
        ? mapQuoteToSpot(symbol, quote)
        : { symbol, error: "quote missing from Yahoo response" };
    });
  } catch (e) {
    console.warn(`[market] dashboard batch quote failed: ${e.message}`);
    targets.forEach(([key, symbol]) => {
      out[key] = { symbol, error: e.message };
    });
  }

  out.timestamp = new Date().toISOString();
  return out;
}

export function symbolFor(instrument) {
  const k = (instrument || "NIFTY").toUpperCase();
  return SYMBOLS[k] || SYMBOLS.NIFTY;
}

// Score what data we actually got, so the UI + LLM can react accordingly.
export function assessDataQuality({ snapshot, indicators, optionChainOk, candles15mCount, dailyCandlesCount }) {
  const issues = [];
  const spot = snapshot;
  if (!spot?.price) issues.push("spot price missing");
  if (candles15mCount === 0) issues.push("no 15-min candles");
  if (candles15mCount > 0 && candles15mCount < 30) issues.push(`only ${candles15mCount} 15-min candles (need 30+ for EMA50)`);
  if (dailyCandlesCount < 2) issues.push("no previous-day candle for CPR");
  if (!indicators?.vwap) issues.push("VWAP unavailable (likely market closed or no today candles)");
  if (!indicators?.opening_range) issues.push("opening range unavailable");
  if (!indicators?.rsi_14) issues.push("RSI unavailable");
  if (!indicators?.ema_9) issues.push("EMA stack unavailable");
  if (!optionChainOk) issues.push("NSE option chain unavailable (regional block or rate limit)");

  // Score from 0 (nothing) to 100 (everything)
  const checks = [
    !!spot?.price,
    candles15mCount >= 30,
    dailyCandlesCount >= 2,
    !!indicators?.vwap,
    !!indicators?.rsi_14,
    !!indicators?.ema_9,
    !!indicators?.cpr,
    !!indicators?.atr_14,
    !!indicators?.supertrend,
    !!optionChainOk,
  ];
  const passed = checks.filter(Boolean).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    band: score >= 75 ? "good" : score >= 45 ? "partial" : "poor",
    issues,
    chart_image_available: true,  // always true if user uploaded
  };
}

export { SYMBOLS };

function mapQuoteToSpot(symbol, quote) {
  return {
    symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePct: quote.regularMarketChangePercent,
    dayHigh: quote.regularMarketDayHigh,
    dayLow: quote.regularMarketDayLow,
    prevClose: quote.regularMarketPreviousClose,
    open: quote.regularMarketOpen,
    time: quote.regularMarketTime,
  };
}

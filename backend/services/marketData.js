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

const QUOTE_CACHE_TTL_MS = Number(process.env.MARKET_QUOTE_CACHE_TTL_MS || 60_000);
const CANDLE_CACHE_TTL_MS = Number(process.env.MARKET_CANDLE_CACHE_TTL_MS || 60_000);
const DASHBOARD_CACHE_TTL_MS = Number(process.env.MARKET_DASHBOARD_CACHE_TTL_MS || 60_000);
const QUOTE_THROTTLE_MS = Number(process.env.MARKET_QUOTE_THROTTLE_MS || 250);

const quoteCache = new Map();
const candleCache = new Map();
let dashboardCache = null;
let dashboardInFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFresh(cacheItem, ttlMs) {
  return Boolean(cacheItem && Date.now() - cacheItem.at < ttlMs);
}

function getFreshCache(cache, key, ttlMs) {
  const item = cache.get(key);
  return isFresh(item, ttlMs) ? item.data : null;
}

function getStaleCache(cache, key) {
  return cache.get(key)?.data ?? null;
}

function setCache(cache, key, data) {
  cache.set(key, { at: Date.now(), data });
  return data;
}

function simplifyYahooError(error) {
  const raw = error?.message || String(error);
  if (/too many requests/i.test(raw)) return "Yahoo Finance rate limit: Too Many Requests";
  if (/Unexpected token/i.test(raw) && /Too Many Requests/i.test(raw)) return "Yahoo Finance rate limit: Too Many Requests";
  return raw;
}

function isRateLimitError(error) {
  return /too many requests/i.test(error?.message || String(error));
}

function normalizeQuote(symbol, q) {
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
}

export async function getSpotQuote(symbol) {
  const cached = getFreshCache(quoteCache, symbol, QUOTE_CACHE_TTL_MS);
  if (cached) return { ...cached, cached: true };

  try {
    const q = await yahooFinance.quote(symbol);
<<<<<<< HEAD
    return mapQuoteToSpot(symbol, q);
=======
    return setCache(quoteCache, symbol, normalizeQuote(symbol, q));
>>>>>>> fcf5df926648b35763a88d89b8bf9e65192ff3ec
  } catch (e) {
    const message = simplifyYahooError(e);
    const stale = getStaleCache(quoteCache, symbol);

    if (stale) {
      console.warn(`[market] quote ${symbol} failed (${message}); using stale cached quote`);
      return {
        ...stale,
        stale: true,
        error: message,
        rate_limited: isRateLimitError(e),
      };
    }

    console.warn(`[market] quote ${symbol} failed: ${message}`);
    return { symbol, error: message, rate_limited: isRateLimitError(e) };
  }
}

function candleCacheKey(symbol, interval, days) {
  return `${symbol}:${interval}:${days}`;
}

function normalizeCandles(quotes, requireOpen = false) {
  return (quotes || [])
    .filter((c) => c.close != null && (!requireOpen || c.open != null))
    .map((c) => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
    }));
}

export async function get15mCandles(symbol, days = 5) {
  const key = candleCacheKey(symbol, "15m", days);
  const cached = getFreshCache(candleCache, key, CANDLE_CACHE_TTL_MS);
  if (cached) return cached;

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const res = await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "15m",
    });
    const candles = normalizeCandles(res?.quotes, true);
    if (candles.length === 0) console.warn(`[market] 15m candles for ${symbol}: empty response`);
    return setCache(candleCache, key, candles);
  } catch (e) {
    const message = simplifyYahooError(e);
    const stale = getStaleCache(candleCache, key);
    if (stale) {
      console.warn(`[market] 15m candles ${symbol} failed (${message}); using stale cached candles`);
      return stale;
    }
    console.warn(`[market] 15m candles ${symbol} failed: ${message}`);
    return [];
  }
}

export async function getDailyCandles(symbol, days = 30) {
  const key = candleCacheKey(symbol, "1d", days);
  const cached = getFreshCache(candleCache, key, CANDLE_CACHE_TTL_MS);
  if (cached) return cached;

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const res = await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "1d",
    });
    const candles = normalizeCandles(res?.quotes);
    if (candles.length === 0) console.warn(`[market] daily candles for ${symbol}: empty response`);
    return setCache(candleCache, key, candles);
  } catch (e) {
    const message = simplifyYahooError(e);
    const stale = getStaleCache(candleCache, key);
    if (stale) {
      console.warn(`[market] daily candles ${symbol} failed (${message}); using stale cached candles`);
      return stale;
    }
    console.warn(`[market] daily candles ${symbol} failed: ${message}`);
    return [];
  }
}

async function loadDashboardSnapshot() {
  const targets = [
    ["nifty", SYMBOLS.NIFTY],
    ["banknifty", SYMBOLS.BANKNIFTY],
    ["indiavix", SYMBOLS.VIX],
    ["usdinr", SYMBOLS.USDINR],
    ["dxy", SYMBOLS.DXY],
    ["crude", SYMBOLS.CRUDE_BRENT],
    ["us10y", SYMBOLS.US10Y],
  ];
<<<<<<< HEAD
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
=======

  const out = {};

  // Sequential calls reduce Yahoo rate-limit spikes compared with firing all quotes at once.
  for (let i = 0; i < targets.length; i++) {
    const [key, sym] = targets[i];
    out[key] = await getSpotQuote(sym);
    if (i < targets.length - 1) await sleep(QUOTE_THROTTLE_MS);
>>>>>>> fcf5df926648b35763a88d89b8bf9e65192ff3ec
  }

  out.timestamp = new Date().toISOString();
  const hasAnyPrice = targets.some(([key]) => out[key]?.price != null);

  if (!hasAnyPrice && dashboardCache?.data) {
    console.warn("[market] dashboard snapshot has no live prices; using stale cached dashboard snapshot");
    return {
      ...dashboardCache.data,
      stale: true,
      error: "Yahoo Finance rate limit or data-source failure. Showing last cached dashboard snapshot.",
      timestamp: out.timestamp,
    };
  }

  dashboardCache = { at: Date.now(), data: out };
  return out;
}

export async function getDashboardSnapshot() {
  if (isFresh(dashboardCache, DASHBOARD_CACHE_TTL_MS)) {
    return { ...dashboardCache.data, cached: true };
  }

  if (dashboardInFlight) return dashboardInFlight;

  dashboardInFlight = loadDashboardSnapshot()
    .finally(() => {
      dashboardInFlight = null;
    });

  return dashboardInFlight;
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

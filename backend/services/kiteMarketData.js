import { kiteOhlc, kiteStatus } from "./kiteConnect.js";

const MARKET_SYMBOLS = {
  nifty: { label: "NIFTY", instrument: "NSE:NIFTY 50" },
  banknifty: { label: "BANKNIFTY", instrument: "NSE:NIFTY BANK" },
  indiavix: { label: "INDIA VIX", instrument: "NSE:INDIA VIX" },
};

const PLACEHOLDER_SYMBOLS = {
  usdinr: { label: "USD/INR", instrument: null },
  dxy: { label: "DXY", instrument: null },
  crude: { label: "BRENT", instrument: null },
  us10y: { label: "US 10Y", instrument: null },
};

function unavailableQuote({ label, instrument }, message = "Not available from Kite index snapshot") {
  return {
    label,
    symbol: instrument,
    price: null,
    change: null,
    changePct: null,
    open: null,
    dayHigh: null,
    dayLow: null,
    prevClose: null,
    unavailable: true,
    error: message,
    source: "kite",
  };
}

function quoteFromKite({ label, instrument }, quote) {
  if (!quote) return unavailableQuote({ label, instrument }, "Kite quote missing");

  const price = Number(quote.last_price ?? 0) || null;
  const open = Number(quote.ohlc?.open ?? 0) || null;
  const dayHigh = Number(quote.ohlc?.high ?? 0) || null;
  const dayLow = Number(quote.ohlc?.low ?? 0) || null;
  const prevClose = Number(quote.ohlc?.close ?? 0) || null;
  const change = price != null && prevClose != null ? price - prevClose : null;
  const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;

  return {
    label,
    symbol: instrument,
    instrument_token: quote.instrument_token,
    price,
    change,
    changePct,
    open,
    dayHigh,
    dayLow,
    prevClose,
    source: "kite",
  };
}

function istClock() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  );

  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function marketStatus() {
  const clock = istClock();
  const weekend = clock.weekday === "Sat" || clock.weekday === "Sun";
  const minutes = clock.hour * 60 + clock.minute;
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;

  if (weekend) {
    return {
      state: "closed",
      label: "Market closed",
      detail: "NSE regular session is closed on weekends",
      is_open: false,
      clock,
    };
  }

  if (minutes < open) {
    return {
      state: "preopen",
      label: "Pre-market",
      detail: "Regular session opens at 09:15 IST",
      is_open: false,
      clock,
    };
  }

  if (minutes <= close) {
    return {
      state: "live",
      label: "Market live",
      detail: "NSE regular session is open",
      is_open: true,
      clock,
    };
  }

  return {
    state: "closed",
    label: "Market closed",
    detail: "Regular session closed at 15:30 IST",
    is_open: false,
    clock,
  };
}

async function safeKiteOhlc(instruments) {
  try {
    return { data: await kiteOhlc(instruments), error: null };
  } catch (error) {
    return { data: {}, error: error.message };
  }
}

export async function getKiteMarketSnapshot() {
  const timestamp = new Date().toISOString();
  const status = marketStatus();
  const kite = kiteStatus();

  if (!kite.authenticated) {
    return {
      source: "kite",
      provider: "kite",
      timestamp,
      market_status: status,
      requires_login: true,
      error: "Kite is not authenticated. Open /api/kite/login?redirect=true first.",
      nifty: unavailableQuote(MARKET_SYMBOLS.nifty, "Kite login required"),
      banknifty: unavailableQuote(MARKET_SYMBOLS.banknifty, "Kite login required"),
      indiavix: unavailableQuote(MARKET_SYMBOLS.indiavix, "Kite login required"),
      ...Object.fromEntries(Object.entries(PLACEHOLDER_SYMBOLS).map(([key, meta]) => [key, unavailableQuote(meta)])),
      summary: { available: 0, total: 3, authenticated: false },
    };
  }

  const coreInstruments = [MARKET_SYMBOLS.nifty.instrument, MARKET_SYMBOLS.banknifty.instrument];
  const vixInstrument = MARKET_SYMBOLS.indiavix.instrument;
  const core = await safeKiteOhlc(coreInstruments);
  const vix = await safeKiteOhlc([vixInstrument]);

  const quotes = {
    nifty: quoteFromKite(MARKET_SYMBOLS.nifty, core.data[MARKET_SYMBOLS.nifty.instrument]),
    banknifty: quoteFromKite(MARKET_SYMBOLS.banknifty, core.data[MARKET_SYMBOLS.banknifty.instrument]),
    indiavix: quoteFromKite(MARKET_SYMBOLS.indiavix, vix.data[MARKET_SYMBOLS.indiavix.instrument]),
  };

  const available = Object.values(quotes).filter((quote) => quote.price != null).length;
  const errors = [core.error, vix.error].filter(Boolean);

  return {
    source: "kite",
    provider: "kite",
    timestamp,
    market_status: status,
    degraded: available < 3,
    error: errors[0] || null,
    ...quotes,
    ...Object.fromEntries(Object.entries(PLACEHOLDER_SYMBOLS).map(([key, meta]) => [key, unavailableQuote(meta)])),
    summary: {
      available,
      total: 3,
      authenticated: true,
      core_error: core.error,
      vix_error: vix.error,
    },
  };
}

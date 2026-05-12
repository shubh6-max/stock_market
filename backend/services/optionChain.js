import axios from "axios";

// NSE option chain — best-effort. Requires browser-like headers and cookie warm-up.
// If it fails (anti-bot, region block), we degrade gracefully.

const NSE_HOME = "https://www.nseindia.com/";
const NSE_OC = (sym) => `https://www.nseindia.com/api/option-chain-indices?symbol=${sym}`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.nseindia.com/option-chain",
};

let cookieJar = "";
let cookieAt = 0;

async function warmCookies() {
  if (Date.now() - cookieAt < 5 * 60 * 1000 && cookieJar) return;
  const r = await axios.get(NSE_HOME, { headers: HEADERS, timeout: 10000, withCredentials: true });
  const setCookies = r.headers["set-cookie"] || [];
  cookieJar = setCookies.map((c) => c.split(";")[0]).join("; ");
  cookieAt = Date.now();
}

export async function fetchOptionChain(instrument = "NIFTY") {
  const sym = instrument.toUpperCase() === "BANKNIFTY" ? "BANKNIFTY" : "NIFTY";
  try {
    await warmCookies();
    const r = await axios.get(NSE_OC(sym), {
      headers: { ...HEADERS, Cookie: cookieJar },
      timeout: 15000,
    });
    return summarizeOptionChain(r.data, sym);
  } catch (e) {
    return { ok: false, error: e.message, instrument: sym };
  }
}

function summarizeOptionChain(data, instrument) {
  const records = data?.records?.data || [];
  const expiry = data?.records?.expiryDates?.[0];
  const underlying = data?.records?.underlyingValue;
  const nearestExpiry = records.filter((r) => r.expiryDate === expiry);

  let totalCE_OI = 0, totalPE_OI = 0;
  let totalCE_OIChange = 0, totalPE_OIChange = 0;
  const strikeMap = new Map();
  for (const r of nearestExpiry) {
    const k = r.strikePrice;
    const ce = r.CE || {};
    const pe = r.PE || {};
    totalCE_OI += ce.openInterest || 0;
    totalPE_OI += pe.openInterest || 0;
    totalCE_OIChange += ce.changeinOpenInterest || 0;
    totalPE_OIChange += pe.changeinOpenInterest || 0;
    strikeMap.set(k, {
      strike: k,
      ce_oi: ce.openInterest || 0,
      ce_oi_change: ce.changeinOpenInterest || 0,
      ce_iv: ce.impliedVolatility || 0,
      ce_ltp: ce.lastPrice || 0,
      pe_oi: pe.openInterest || 0,
      pe_oi_change: pe.changeinOpenInterest || 0,
      pe_iv: pe.impliedVolatility || 0,
      pe_ltp: pe.lastPrice || 0,
    });
  }

  const all = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
  const topCE = [...all].sort((a, b) => b.ce_oi - a.ce_oi).slice(0, 5).map((s) => ({ strike: s.strike, oi: s.ce_oi }));
  const topPE = [...all].sort((a, b) => b.pe_oi - a.pe_oi).slice(0, 5).map((s) => ({ strike: s.strike, oi: s.pe_oi }));
  const pcr = totalCE_OI ? totalPE_OI / totalCE_OI : null;

  // Max pain: strike with min combined payout
  let maxPain = null, minPay = Infinity;
  for (const s of all) {
    let pay = 0;
    for (const t of all) {
      if (s.strike > t.strike) pay += (s.strike - t.strike) * t.ce_oi;
      if (s.strike < t.strike) pay += (t.strike - s.strike) * t.pe_oi;
    }
    if (pay < minPay) { minPay = pay; maxPain = s.strike; }
  }

  // Nearest ATM strike and 2 above/below
  const atm = all.reduce(
    (best, s) => Math.abs(s.strike - underlying) < Math.abs((best?.strike ?? Infinity) - underlying) ? s : best,
    null
  );
  const idx = all.findIndex((s) => s.strike === atm?.strike);
  const window = all.slice(Math.max(0, idx - 3), idx + 4);

  return {
    ok: true,
    instrument,
    expiry,
    underlying,
    pcr: pcr ? Number(pcr.toFixed(3)) : null,
    max_pain: maxPain,
    total_ce_oi: totalCE_OI,
    total_pe_oi: totalPE_OI,
    total_ce_oi_change: totalCE_OIChange,
    total_pe_oi_change: totalPE_OIChange,
    top_ce_oi: topCE,
    top_pe_oi: topPE,
    atm_window: window,
  };
}

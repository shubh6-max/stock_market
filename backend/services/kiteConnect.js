import axios from "axios";
import crypto from "crypto";

const API_BASE = "https://api.kite.trade";
const LOGIN_BASE = "https://kite.zerodha.com/connect/login?v=3";

let sessionData = null;

function requireKiteConfig({ needSecret = false } = {}) {
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;
  const redirectUrl = process.env.KITE_REDIRECT_URL;

  if (!apiKey) throw new Error("KITE_API_KEY is missing in backend/.env");
  if (!redirectUrl) throw new Error("KITE_REDIRECT_URL is missing in backend/.env");
  if (needSecret && !apiSecret) throw new Error("KITE_API_SECRET is missing in backend/.env");

  return { apiKey, apiSecret, redirectUrl };
}

function publicSession(data) {
  if (!data) return null;
  return {
    user_id: data.user_id,
    user_name: data.user_name,
    user_shortname: data.user_shortname,
    email: data.email,
    broker: data.broker,
    exchanges: data.exchanges,
    products: data.products,
    login_time: data.login_time,
    authenticated: Boolean(data["access_token"]),
  };
}

function kiteData(response) {
  if (response?.data?.status === "success") return response.data.data;
  throw new Error(response?.data?.message || "Kite request failed");
}

function authHeaders() {
  const { apiKey } = requireKiteConfig();
  if (!sessionData?.["access_token"]) throw new Error("Kite is not authenticated. Open /api/kite/login first.");
  return {
    "X-Kite-Version": "3",
    Authorization: `token ${apiKey}:${sessionData["access_token"]}`,
  };
}

function list(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(",");
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function kiteLoginUrl() {
  const { apiKey } = requireKiteConfig();
  return `${LOGIN_BASE}&api_key=${encodeURIComponent(apiKey)}`;
}

export function kiteStatus() {
  return {
    configured: Boolean(process.env.KITE_API_KEY && process.env.KITE_REDIRECT_URL),
    api_key_present: Boolean(process.env.KITE_API_KEY),
    redirect_url: process.env.KITE_REDIRECT_URL || null,
    authenticated: Boolean(sessionData?.["access_token"]),
    session: publicSession(sessionData),
  };
}

export function kiteChecksum(apiKey, requestToken, apiSecret) {
  return crypto.createHash("sha256").update(`${apiKey}${requestToken}${apiSecret}`).digest("hex");
}

export async function kiteCallback(requestToken) {
  const { apiKey, apiSecret } = requireKiteConfig({ needSecret: true });
  if (!requestToken) throw new Error("request_token missing from Kite callback");

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum: kiteChecksum(apiKey, requestToken, apiSecret),
  });

  const response = await axios.post(`${API_BASE}/session/token`, body, {
    headers: {
      "X-Kite-Version": "3",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  sessionData = kiteData(response);
  return publicSession(sessionData);
}

export async function kiteProfile() {
  const response = await axios.get(`${API_BASE}/user/profile`, { headers: authHeaders() });
  return kiteData(response);
}

export async function kiteMargins(segment = null) {
  const url = segment ? `${API_BASE}/user/margins/${segment}` : `${API_BASE}/user/margins`;
  const response = await axios.get(url, { headers: authHeaders() });
  return kiteData(response);
}

export async function kiteQuote(input) {
  const instruments = list(input);
  if (!instruments.length) throw new Error("Pass instruments like ?i=NSE:INFY&i=NSE:NIFTY 50");
  const response = await axios.get(`${API_BASE}/quote`, {
    headers: authHeaders(),
    params: { i: instruments },
    paramsSerializer: { indexes: null },
  });
  return kiteData(response);
}

export async function kiteOhlc(input) {
  const instruments = list(input);
  if (!instruments.length) throw new Error("Pass instruments like ?i=NSE:INFY&i=NSE:NIFTY 50");
  const response = await axios.get(`${API_BASE}/quote/ohlc`, {
    headers: authHeaders(),
    params: { i: instruments },
    paramsSerializer: { indexes: null },
  });
  return kiteData(response);
}

export async function kiteLtp(input) {
  const instruments = list(input);
  if (!instruments.length) throw new Error("Pass instruments like ?i=NSE:INFY&i=NSE:NIFTY 50");
  const response = await axios.get(`${API_BASE}/quote/ltp`, {
    headers: authHeaders(),
    params: { i: instruments },
    paramsSerializer: { indexes: null },
  });
  return kiteData(response);
}

export async function kiteHistorical({ instrumentToken, interval = "day", from, to, continuous = 0, oi = 0 }) {
  if (!instrumentToken) throw new Error("instrument_token is required");
  if (!from || !to) throw new Error("from and to are required");
  const response = await axios.get(`${API_BASE}/instruments/historical/${instrumentToken}/${interval}`, {
    headers: authHeaders(),
    params: { from, to, continuous, oi },
  });
  return kiteData(response);
}

export { API_BASE };

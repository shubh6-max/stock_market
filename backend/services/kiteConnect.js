import axios from "axios";
import crypto from "crypto";

const API_BASE = "https://api.kite.trade";
const LOGIN_BASE = "https://kite.zerodha.com/connect/login?v=3";

export function kiteLoginUrl() {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) throw new Error("KITE_API_KEY is missing in backend/.env");
  return `${LOGIN_BASE}&api_key=${encodeURIComponent(apiKey)}`;
}

export function kiteStatus() {
  return {
    configured: Boolean(process.env.KITE_API_KEY && process.env.KITE_REDIRECT_URL),
    api_key_present: Boolean(process.env.KITE_API_KEY),
    redirect_url: process.env.KITE_REDIRECT_URL || null,
  };
}

export function kiteChecksum(apiKey, requestToken, apiSecret) {
  return crypto.createHash("sha256").update(`${apiKey}${requestToken}${apiSecret}`).digest("hex");
}

export { API_BASE };

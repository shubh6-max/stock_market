import {
  kiteStatus,
  kiteLoginUrl,
  kiteCallback,
  kiteProfile,
  kiteMargins,
  kiteQuote,
  kiteOhlc,
  kiteLtp,
  kiteHistorical,
} from "../services/kiteConnect.js";
import { getKiteMarketSnapshot } from "../services/kiteMarketData.js";

function sendError(res, error) {
  const status = /missing|required|not authenticated/i.test(error.message) ? 400 : 500;
  res.status(status).json({ ok: false, error: error.message });
}

function appUrl(status = "connected") {
  const base = process.env.FRONTEND_URL || "http://localhost:5173";
  const url = new URL(base);
  url.searchParams.set("kite", status);
  return url.toString();
}

export function registerKiteRoutes(app) {
  // This route is registered before the legacy Yahoo /api/market route in server.js,
  // so the live dashboard now uses Kite when MARKET_DATA_PROVIDER=kite.
  app.get("/api/market", async (_req, res, next) => {
    if ((process.env.MARKET_DATA_PROVIDER || "").toLowerCase() !== "kite") return next();
    try {
      res.json(await getKiteMarketSnapshot());
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/status", (_req, res) => {
    try {
      res.json({ ok: true, ...kiteStatus() });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/login", (req, res) => {
    try {
      const loginUrl = kiteLoginUrl();
      if (req.query.redirect === "true") return res.redirect(loginUrl);
      res.json({ ok: true, login_url: loginUrl });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/callback", async (req, res) => {
    try {
      // If user opens the callback URL directly, start the Kite login flow.
      if (!req.query.request_token && !req.query.status) {
        return res.redirect("/api/kite/login?redirect=true");
      }

      if (req.query.status && req.query.status !== "success") {
        return res.redirect(appUrl("failed"));
      }

      await kiteCallback(req.query.request_token);
      return res.redirect(appUrl("connected"));
    } catch (error) {
      console.error("[kite] callback error", error);
      return res.redirect(appUrl("error"));
    }
  });

  app.get("/api/kite/profile", async (_req, res) => {
    try {
      res.json({ ok: true, data: await kiteProfile() });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/margins", async (req, res) => {
    try {
      res.json({ ok: true, data: await kiteMargins(req.query.segment || null) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/quote", async (req, res) => {
    try {
      res.json({ ok: true, data: await kiteQuote(req.query.i) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/ohlc", async (req, res) => {
    try {
      res.json({ ok: true, data: await kiteOhlc(req.query.i) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/ltp", async (req, res) => {
    try {
      res.json({ ok: true, data: await kiteLtp(req.query.i) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/kite/historical", async (req, res) => {
    try {
      res.json({
        ok: true,
        data: await kiteHistorical({
          instrumentToken: req.query.instrument_token,
          interval: req.query.interval || "day",
          from: req.query.from,
          to: req.query.to,
          continuous: req.query.continuous || 0,
          oi: req.query.oi || 0,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });
}

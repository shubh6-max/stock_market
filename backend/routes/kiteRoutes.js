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

function sendError(res, error) {
  const status = /missing|required|not authenticated/i.test(error.message) ? 400 : 500;
  res.status(status).json({ ok: false, error: error.message });
}

export function registerKiteRoutes(app) {
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
      if (req.query.status && req.query.status !== "success") {
        return res.status(400).send(`<h2>Kite login failed</h2><p>Status: ${req.query.status}</p>`);
      }

      const session = await kiteCallback(req.query.request_token);
      res.send(`
        <html>
          <body style="font-family: system-ui; padding: 32px;">
            <h2>Kite connected successfully</h2>
            <p>User: ${session.user_shortname || session.user_name || session.user_id}</p>
            <p>You can close this tab and return to StrikePilot.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`<h2>Kite callback error</h2><pre>${error.message}</pre>`);
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

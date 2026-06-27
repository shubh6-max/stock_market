import { getKiteCandles } from "../services/kiteCandles.js";

function sendError(res, error) {
  const status = /missing|required|not authenticated/i.test(error.message) ? 400 : 500;
  res.status(status).json({ ok: false, error: error.message });
}

export function registerChartRoutes(app) {
  app.get("/api/charts/candles", async (req, res) => {
    try {
      const instrument = req.query.instrument || req.query.symbol || "NSE:NIFTY 50";
      const interval = req.query.interval || "15minute";
      const days = Number(req.query.days || (interval === "day" ? 240 : 7));
      const data = await getKiteCandles({
        instrument,
        interval,
        days,
        from: req.query.from,
        to: req.query.to,
        oi: req.query.oi || 0,
      });
      res.json({ ok: true, ...data });
    } catch (error) {
      sendError(res, error);
    }
  });
}

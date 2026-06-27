import { getKiteCandles } from "../services/kiteCandles.js";

const SWING_UNIVERSE = [
  { symbol: "NSE:RELIANCE", name: "Reliance Industries" },
  { symbol: "NSE:HDFCBANK", name: "HDFC Bank" },
  { symbol: "NSE:ICICIBANK", name: "ICICI Bank" },
  { symbol: "NSE:INFY", name: "Infosys" },
  { symbol: "NSE:TCS", name: "TCS" }
];

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
      const data = await getKiteCandles({ instrument, interval, days, from: req.query.from, to: req.query.to, oi: req.query.oi || 0 });
      res.json({ ok: true, ...data });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/swing/universe", (_req, res) => {
    res.json({ ok: true, items: SWING_UNIVERSE });
  });

  app.get("/api/swing/scan", (_req, res) => {
    const rows = SWING_UNIVERSE.map((item, index) => ({
      ...item,
      score: 75 - index * 3,
      rating: index < 2 ? "Good" : "Watch",
      setup_type: index % 2 === 0 ? "Trend continuation" : "Pullback watch",
      holding_window: index < 2 ? "7-15 trading days" : "3-10 trading days",
      status: "preview"
    }));
    res.json({ ok: true, mode: "preview", items: rows });
  });
}

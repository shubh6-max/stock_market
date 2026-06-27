const UNIVERSE = [
  { symbol: "NSE:RELIANCE", name: "Reliance Industries" },
  { symbol: "NSE:HDFCBANK", name: "HDFC Bank" },
  { symbol: "NSE:ICICIBANK", name: "ICICI Bank" },
  { symbol: "NSE:INFY", name: "Infosys" },
  { symbol: "NSE:TCS", name: "TCS" },
  { symbol: "NSE:LT", name: "Larsen & Toubro" },
  { symbol: "NSE:SBIN", name: "State Bank of India" },
  { symbol: "NSE:AXISBANK", name: "Axis Bank" },
  { symbol: "NSE:BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "NSE:MARUTI", name: "Maruti Suzuki" }
];

function sendError(res, error) {
  res.status(500).json({ ok: false, error: error.message });
}

export function registerSwingRoutes(app) {
  app.get("/api/swing/universe", (_req, res) => {
    res.json({ ok: true, items: UNIVERSE });
  });

  app.get("/api/swing/scan", (_req, res) => {
    try {
      const preview = UNIVERSE.slice(0, 5).map((item, index) => ({
        ...item,
        score: 75 - index * 3,
        rating: index < 2 ? "Good" : "Watch",
        setup_type: index % 2 === 0 ? "Trend continuation" : "Pullback watch",
        holding_window: index < 2 ? "7-15 trading days" : "3-10 trading days",
        status: "scanner engine pending candle scoring"
      }));
      res.json({ ok: true, mode: "preview", items: preview });
    } catch (error) {
      sendError(res, error);
    }
  });
}

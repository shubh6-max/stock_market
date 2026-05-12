import db from "./db.js";

const WIN = new Set(["TARGET1_HIT", "TARGET2_HIT"]);
const LOSS = new Set(["SL_HIT"]);
const DECISIVE = new Set([...WIN, ...LOSS, "MANUAL_EXIT"]);

export function overallStats() {
  const rows = db.joined();
  const taken = rows.filter((x) => x.decision !== "NO_TRADE");
  const closed = rows.filter((x) => DECISIVE.has(x.outcome));
  const wins = closed.filter((x) => WIN.has(x.outcome));
  const losses = closed.filter((x) => LOSS.has(x.outcome));
  const totalPnl = closed.reduce((s, x) => s + (x.pnl_inr || 0), 0);
  const avgWin = wins.length ? wins.reduce((s, x) => s + (x.pnl_inr || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, x) => s + (x.pnl_inr || 0), 0) / losses.length : 0;
  return {
    total_recommendations: rows.length,
    trades_taken: taken.length,
    no_trades: rows.length - taken.length,
    trades_closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: closed.length ? Number(((wins.length / closed.length) * 100).toFixed(1)) : null,
    total_pnl_inr: Math.round(totalPnl),
    avg_win_inr: Math.round(avgWin),
    avg_loss_inr: Math.round(avgLoss),
    expectancy_inr: closed.length ? Math.round(totalPnl / closed.length) : null,
  };
}

export function setupStats() {
  const rows = db.joined().filter((r) => r.setup_type);
  const buckets = new Map();
  for (const x of rows) {
    if (!buckets.has(x.setup_type)) buckets.set(x.setup_type, { total: 0, closed: 0, wins: 0, losses: 0, confSum: 0 });
    const b = buckets.get(x.setup_type);
    b.total++;
    b.confSum += x.confidence_adj || 0;
    if (DECISIVE.has(x.outcome)) {
      b.closed++;
      if (WIN.has(x.outcome)) b.wins++;
      if (LOSS.has(x.outcome)) b.losses++;
    }
  }
  return Array.from(buckets.entries())
    .map(([setup_type, b]) => ({
      setup_type,
      total: b.total,
      closed: b.closed,
      wins: b.wins,
      losses: b.losses,
      win_rate: b.closed ? Number(((b.wins / b.closed) * 100).toFixed(1)) : null,
      avg_confidence: b.total ? Number((b.confSum / b.total).toFixed(1)) : null,
    }))
    .sort((a, b) => (b.closed - a.closed) || (b.total - a.total));
}

export function confidenceCalibration() {
  const rows = db.joined().filter((r) => r.confidence_adj != null && r.outcome);
  const buckets = [
    { range: "0-40", min: 0, max: 40, total: 0, wins: 0 },
    { range: "41-60", min: 41, max: 60, total: 0, wins: 0 },
    { range: "61-75", min: 61, max: 75, total: 0, wins: 0 },
    { range: "76-85", min: 76, max: 85, total: 0, wins: 0 },
    { range: "86-100", min: 86, max: 100, total: 0, wins: 0 },
  ];
  for (const x of rows) {
    if (!DECISIVE.has(x.outcome)) continue;
    const b = buckets.find((b) => x.confidence_adj >= b.min && x.confidence_adj <= b.max);
    if (!b) continue;
    b.total++;
    if (WIN.has(x.outcome)) b.wins++;
  }
  return buckets.map((b) => ({
    ...b,
    win_rate: b.total ? Number(((b.wins / b.total) * 100).toFixed(1)) : null,
  }));
}

export function dailyPnl(days = 30) {
  const rows = db.joined().filter((r) => r.pnl_inr != null && r.result_at);
  const map = new Map();
  for (const r of rows) {
    const day = r.result_at.slice(0, 10);
    if (!map.has(day)) map.set(day, { day, pnl: 0, trades: 0 });
    const b = map.get(day);
    b.pnl += r.pnl_inr;
    b.trades++;
  }
  return Array.from(map.values())
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-days);
}

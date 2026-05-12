// Pure-JS JSON-file store. Atomic writes via temp file + rename.
// Two collections: recommendations and results. In-memory cache, flushed on every write.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, "quantsignal.json");

let state = { recommendations: [], results: [] };

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, "utf8");
      const parsed = JSON.parse(raw);
      state.recommendations = parsed.recommendations || [];
      state.results = parsed.results || [];
    }
  } catch (e) {
    console.warn("[db] load failed, starting fresh:", e.message);
  }
}
load();

function flush() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

export const db = {
  insertRecommendation(rec) {
    state.recommendations.push(rec);
    flush();
  },
  findRecommendation(id) {
    return state.recommendations.find((r) => r.id === id) || null;
  },
  listRecommendations({ limit = 50, offset = 0, instrument = null } = {}) {
    let rows = [...state.recommendations];
    if (instrument) rows = rows.filter((r) => r.instrument === instrument);
    rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const sliced = rows.slice(offset, offset + limit);
    return sliced.map((r) => {
      const res = state.results.find((x) => x.rec_id === r.id);
      if (!res) return r;
      return {
        ...r,
        outcome: res.outcome,
        pnl_inr: res.pnl_inr,
        exit_price: res.exit_price,
        mistake_reason: res.mistake_reason,
        user_note: res.user_note,
        actual_lots: res.actual_lots,
        actual_entry: res.actual_entry,
        actual_exit: res.actual_exit,
        result_at: res.updated_at,
      };
    });
  },
  findResult(rec_id) {
    return state.results.find((x) => x.rec_id === rec_id) || null;
  },
  upsertResult(result) {
    const existing = state.results.find((r) => r.rec_id === result.rec_id);
    if (existing) Object.assign(existing, result);
    else state.results.push(result);
    flush();
  },
  deleteRecommendation(id) {
    const before = state.recommendations.length;
    state.recommendations = state.recommendations.filter((r) => r.id !== id);
    state.results = state.results.filter((r) => r.rec_id !== id);
    flush();
    return before - state.recommendations.length;
  },
  count() {
    return state.recommendations.length;
  },
  joined() {
    // recommendations LEFT JOIN results — used by analytics
    return state.recommendations.map((r) => {
      const res = state.results.find((x) => x.rec_id === r.id);
      return {
        ...r,
        outcome: res?.outcome,
        pnl_inr: res?.pnl_inr,
        exit_price: res?.exit_price,
        actual_lots: res?.actual_lots,
        actual_entry: res?.actual_entry,
        actual_exit: res?.actual_exit,
        mistake_reason: res?.mistake_reason,
        user_note: res?.user_note,
        result_at: res?.updated_at,
      };
    });
  },
};

export default db;

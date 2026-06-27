import test from "node:test";
import assert from "node:assert/strict";

import yahooFinance from "yahoo-finance2";
import { getDashboardSnapshot } from "../services/marketData.js";

test("getDashboardSnapshot fetches Yahoo quotes in one batched request", async () => {
  const expectedSymbols = [
    "^NSEI",
    "^NSEBANK",
    "^INDIAVIX",
    "INR=X",
    "DX-Y.NYB",
    "BZ=F",
    "^TNX",
  ];

  const quoteMock = test.mock.method(yahooFinance, "quote", async (symbols, options) => {
    assert.deepEqual(symbols, expectedSymbols);
    assert.deepEqual(options, { return: "object" });

    return Object.fromEntries(symbols.map((symbol, index) => [symbol, {
      symbol,
      regularMarketPrice: index + 100,
      regularMarketChange: index + 1,
      regularMarketChangePercent: index + 0.1,
      regularMarketDayHigh: index + 110,
      regularMarketDayLow: index + 90,
      regularMarketPreviousClose: index + 99,
      regularMarketOpen: index + 98,
      regularMarketTime: new Date("2026-06-28T03:30:00.000Z"),
    }]));
  });

  try {
    const snapshot = await getDashboardSnapshot();

    assert.equal(quoteMock.mock.calls.length, 1);
    assert.deepEqual(quoteMock.mock.calls[0].arguments[0], expectedSymbols);

    assert.equal(snapshot.nifty.price, 100);
    assert.equal(snapshot.banknifty.price, 101);
    assert.equal(snapshot.indiavix.price, 102);
    assert.equal(snapshot.usdinr.price, 103);
    assert.equal(snapshot.dxy.price, 104);
    assert.equal(snapshot.crude.price, 105);
    assert.equal(snapshot.us10y.price, 106);
    assert.match(snapshot.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    quoteMock.mock.restore();
  }
});

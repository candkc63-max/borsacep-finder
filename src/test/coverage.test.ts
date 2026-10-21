import { describe, expect, it } from "vitest";
import { STOCKS, type Stock } from "@/data/stocks";
import {
  coverageSummary,
  coverageText,
  mergeScan,
  missingLabels,
  planBatches,
  quoteReport,
  settleQuotes,
  technicalQueue,
} from "@/screener/coverage";
import { toScreenerRow } from "@/screener/model";

function base(ticker: string, price = 10): Stock {
  return { ticker, name: ticker, sector: "Deneme", price, marketCap: price, pe: 5, pb: 1, roe: 10, dividendYield: 1, change1y: 1 };
}

describe("screener coverage", () => {
  it("keeps the bundled list at the sample size and does not call it the full BIST universe", () => {
    expect(STOCKS).toHaveLength(32);
    const report = quoteReport("Yahoo Finance", "2026-10-20T08:00:00Z", STOCKS.map((stock) => ({ ...stock, dataStatus: "sample" })));
    expect(report.universe).toBe(32);
    expect(report.fullBist).toBe(false);
    expect(report.membership).toBeNull();
    expect(report.scanned).toBe(0);
  });

  it("keeps a failed quote in the universe and does not count it as scanned", () => {
    const universe = [base("AAA", 10), base("BBB", 20), base("CCC", 30)];
    const settled = settleQuotes(universe, [
      { ticker: "AAA", stock: { ...base("AAA", 11), pe: null, eps: null } },
      { ticker: "BBB", stock: null },
    ], "2026-10-20T08:00:00Z", "Yahoo Finance");
    expect(settled).toHaveLength(3);
    expect(settled.map((stock) => stock.dataStatus)).toEqual(["ok", "missing", "missing"]);
    const rows = settled.map((stock) => toScreenerRow(stock));
    const summary = coverageSummary(rows);
    expect(summary).toMatchObject({ universe: 3, scanned: 1, missing: 2, sample: 0, fullBist: false });
    expect(rows[1].price).toBe(0);
    expect(rows[1].pe).toBeNull();
    expect(coverageText(rows[1])).toBe("Yahoo Finance · kotasyon yok");
    expect(coverageText(rows[0])).toContain("Yahoo Finance");
    expect(coverageText(rows[0])).toContain("eksik:");
    expect(missingLabels(settled[0], false)).toContain("gösterge");
    expect(missingLabels(settled[0], true)).not.toContain("gösterge");
  });

  it("does not cache a missing quote and does not revive a stale one", () => {
    const universe = [base("AAA"), base("BBB")];
    const ok = settleQuotes(universe, [{ ticker: "AAA", stock: base("AAA", 12) }, { ticker: "BBB", stock: base("BBB", 8) }], "2026-10-20T08:00:00Z", "Yahoo Finance");
    const first = mergeScan(universe, ok, {}, 1_000, 1_000);
    expect(first.cache.AAA.stock.price).toBe(12);
    expect(first.cache.BBB).toBeTruthy();
    const failed = settleQuotes(universe, [{ ticker: "AAA", stock: null }, { ticker: "BBB", stock: null }], "2026-10-20T08:05:00Z", "Yahoo Finance");
    const fresh = mergeScan(universe, failed, first.cache, 1_500, 1_000);
    expect(fresh.stocks.find((stock) => stock.ticker === "AAA")?.dataStatus).toBe("ok");
    expect(fresh.stocks.find((stock) => stock.ticker === "AAA")?.price).toBe(12);
    expect(fresh.cache.BBB?.stock.dataStatus).toBe("ok");
    const stale = mergeScan(universe, failed, first.cache, 3_000, 1_000);
    expect(stale.stocks.every((stock) => stock.dataStatus === "missing")).toBe(true);
    expect(Object.values(stale.cache).every((entry) => entry.stock.dataStatus === "ok")).toBe(true);
    expect(coverageSummary(stale.stocks.map((stock) => toScreenerRow(stock))).scanned).toBe(0);
  });

  it("plans batches and skips symbols whose technical scan already failed", () => {
    expect(planBatches(["A", "B", "C", "D", "E"], 2)).toEqual([["A", "B"], ["C", "D"], ["E"]]);
    expect(technicalQueue(["AAA", "BBB", "CCC"], ["AAA"], ["BBB"])).toEqual(["CCC"]);
  });
});

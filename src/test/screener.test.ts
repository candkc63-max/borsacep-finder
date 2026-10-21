import { describe, expect, it } from "vitest";
import { ema } from "../../chart/lib/indicators";
import { STOCKS } from "@/data/stocks";
import { chartHash, isChartHash, tickerFromHash } from "@/screener/chartLink";
import { acceptMembership, indexesFor } from "@/screener/membership";
import {
  PRESETS,
  applyScreen,
  clampWidth,
  pageOf,
  presetRules,
  toScreenerRow,
  type Rule,
  type ScreenerRow,
} from "@/screener/model";
import { brokeRecord, closedBars, snapshotFromBars, type BarPoint, type TechnicalSnapshot } from "@/screener/snapshot";
import { parseScreens, toggleTicker } from "@/screener/store";
import { chartSpec } from "@/server/chartBars";

function bars(closes: number[], volume = 100): BarPoint[] {
  return closes.map((close) => ({ high: close, low: close, close, volume }));
}

function query(patch: Partial<Parameters<typeof applyScreen>[1]> = {}) {
  return {
    rules: [],
    search: "",
    universe: "all" as const,
    watchlist: [],
    sortKey: "ticker",
    sortDesc: false,
    ...patch,
  };
}

function rule(field: string, op: Rule["op"], value = "", valueTo = ""): Rule {
  return { id: field, field, op, value, valueTo };
}

describe("screener engine", () => {
  it("filters, sorts nulls last and pages without inventing values", () => {
    const rows = STOCKS.map((stock) => toScreenerRow(stock));
    const dividend = applyScreen(rows, query({ rules: presetRules("dividend"), sortKey: "dividendYield", sortDesc: true }));
    expect(dividend.some((row) => row.ticker === "FROTO")).toBe(true);
    expect(dividend.some((row) => row.ticker === "THYAO")).toBe(false);
    expect(dividend.some((row) => row.ticker === "VAKBN")).toBe(false);
    const value = applyScreen(rows, query({ rules: presetRules("value") }));
    expect(value).toHaveLength(0);
    const withGap = [...rows, toScreenerRow({ ...STOCKS[0], ticker: "BOS", pe: null })];
    const sorted = applyScreen(withGap, query({ sortKey: "pe", sortDesc: true }));
    expect(sorted.at(-1)?.ticker).toBe("BOS");
    const ascending = applyScreen(withGap, query({ sortKey: "pe", sortDesc: false }));
    expect(ascending.at(-1)?.ticker).toBe("BOS");
    const paged = pageOf(sorted, 2, 25);
    expect(paged.page).toBe(2);
    expect(paged.rows.length).toBe(sorted.length - 25);
    expect(clampWidth(10)).toBe(72);
    expect(clampWidth(999)).toBe(360);
    expect(clampWidth(Number.NaN)).toBe(110);
  });

  it("does not invent index membership and only uses a verified book", () => {
    const rows = STOCKS.map((stock) => toScreenerRow(stock));
    expect(indexesFor("GARAN")).toEqual([]);
    expect(indexesFor("ULKER")).toEqual([]);
    expect(applyScreen(rows, query({ universe: "bist50" }))).toHaveLength(0);
    expect(applyScreen(rows, query({ universe: "bist100" }))).toHaveLength(0);
    const book = acceptMembership({ verified: true, source: "deneme kaydı", asOf: "2026-10-01T00:00:00Z", bist100: ["GARAN", "ULKER"], bist50: ["GARAN"] });
    const tagged = STOCKS.map((stock) => toScreenerRow(stock, null, book));
    expect(applyScreen(tagged, query({ universe: "bist50" })).map((row) => row.ticker)).toEqual(["GARAN"]);
    expect(applyScreen(tagged, query({ universe: "bist100" })).map((row) => row.ticker).sort()).toEqual(["GARAN", "ULKER"]);
    expect(acceptMembership({ verified: false, source: "tahmin", asOf: "2026-10-01", bist100: ["GARAN"], bist50: [] })).toBeNull();
    const watch = applyScreen(rows, query({ universe: "watch", watchlist: ["LOGO"] }));
    expect(watch.map((row) => row.ticker)).toEqual(["LOGO"]);
    expect(applyScreen(rows, query({ rules: [rule("market", "eq", "Yıldız")] }))).toHaveLength(0);
  });

  it("uses closed bars for indicators and does not read the still-open bar", () => {
    const closes = Array.from({ length: 40 }, (_, index) => index + 1);
    const snap = snapshotFromBars(bars(closes));
    expect(snap?.ema20).toBeCloseTo(ema(closes, 20).at(-1)!);
    expect(snap?.aboveEma20).toBe(true);
    expect(snap?.ema200).toBeNull();
    expect(snap?.emaBullStack).toBeNull();
    const now = new Date("2026-10-20T15:00:00+03:00");
    const series = [
      { time: "2026-10-19T00:00:00+03:00", high: 10, low: 9, close: 10, volume: 10 },
      { time: "2026-10-20T00:00:00+03:00", high: 50, low: 49, close: 50, volume: 10 },
    ];
    expect(brokeRecord(series.map((bar) => bar.high), series.map((bar) => bar.close), 5)).toBe(true);
    const closed = closedBars(series, "1d", now);
    expect(closed).toHaveLength(1);
    expect(snapshotFromBars(closed)).toBeNull();
    expect(closedBars(series, "1d", new Date("2026-10-21T01:00:00+03:00"))).toHaveLength(2);
  });

  it("detects a prior-window breakout, support hold and EMA stack", () => {
    const quiet = Array.from({ length: 25 }, () => 10);
    const snap = snapshotFromBars([...bars(quiet), { high: 12, low: 11, close: 12, volume: 300 }]);
    const row = toScreenerRow(STOCKS[0], snap);
    expect(applyScreen([row], query({ rules: [rule("recordBreak", "breaks", "20")] }))).toHaveLength(1);
    expect(applyScreen([row], query({ rules: [rule("breakout", "breaks", "20")] }))).toHaveLength(1);
    expect(applyScreen([row], query({ rules: [rule("breakout", "breaks", "20"), rule("relativeVolume", "gt", "2")] }))).toHaveLength(1);
    expect(row.relativeVolume).toBeCloseTo(3);
    const supportCloses = [
      ...Array.from({ length: 40 }, () => 80),
      ...Array.from({ length: 20 }, () => 100),
      ...Array.from({ length: 15 }, () => 96),
    ];
    expect(snapshotFromBars(bars(supportCloses))?.declineAboveSupport).toBe(true);
    const trend = Array.from({ length: 220 }, (_, index) => index + 1);
    const trendSnap = snapshotFromBars(bars(trend));
    expect(trendSnap?.emaBullStack).toBe(true);
    expect(applyScreen([toScreenerRow(STOCKS[0], trendSnap)], query({ rules: presetRules("ema") }))).toHaveLength(1);
    expect(applyScreen([toScreenerRow(STOCKS[0], null)], query({ rules: presetRules("ema") }))).toHaveLength(0);
  });

  it("keeps an empty numeric rule inactive and prefers the bar relative volume", () => {
    const base = toScreenerRow({ ...STOCKS[0], relativeVolume: 3, week52Distance: 2 });
    expect(applyScreen([base], query({ rules: [rule("price", "gt", "")] }))).toHaveLength(1);
    expect(applyScreen([base], query({ rules: [rule("price", "gt", "1000")] }))).toHaveLength(0);
    expect(applyScreen([base], query({ rules: [rule("week52Distance", "near", "3")] }))).toHaveLength(1);
    const technical = { relativeVolume: 0.4, week52Distance: 20 } as TechnicalSnapshot;
    const overridden = toScreenerRow({ ...STOCKS[0], relativeVolume: 3, week52Distance: 2 }, technical);
    expect(applyScreen([overridden], query({ rules: [rule("relativeVolume", "gt", "2")] }))).toHaveLength(0);
  });

  it("screens a few thousand rows quickly", () => {
    const rows: ScreenerRow[] = Array.from({ length: 2000 }, (_, index) => toScreenerRow({
      ticker: `S${String(index).padStart(4, "0")}`,
      name: `Sirket ${index}`,
      sector: index % 2 ? "Bankacılık" : "Enerji",
      price: index,
      marketCap: index,
      pe: index % 5 === 0 ? null : index,
      pb: 1,
      roe: 10,
      dividendYield: 1,
      change1y: 1,
    }));
    const started = performance.now();
    const found = applyScreen(rows, query({ rules: [rule("price", "gt", "1500")], sortKey: "price", sortDesc: true }));
    expect(performance.now() - started).toBeLessThan(100);
    expect(found).toHaveLength(499);
    expect(found[0].ticker).toBe("S1999");
  });

  it("round-trips a saved screen and drops a broken record", () => {
    const rules = presetRules("profit");
    const raw = JSON.stringify([
      { id: "a", name: "Karlılığı güçlü hisseler", rules, columns: ["ticker", "roe", "yok"], sortKey: "roe", sortDesc: true, tab: "profit", universe: "bist100", interval: "1wk" },
      { id: "bad", name: "", rules: [] },
      { scale: { enabled: "evet" } },
    ]);
    const parsed = parseScreens(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].columns).toEqual(["ticker", "roe"]);
    expect(parsed[0].interval).toBe("1wk");
    expect(parseScreens("not-json")).toEqual([]);
    expect(toggleTicker(["THYAO"], "GARAN")).toEqual(["THYAO", "GARAN"]);
    expect(toggleTicker(["THYAO"], "THYAO")).toEqual([]);
    expect(PRESETS.map((preset) => preset.name)).toContain("Hacimli breakout adayları");
  });

  it("opens the chart for a symbol and leaves the plain chart hash alone", () => {
    expect(isChartHash("#grafik")).toBe(true);
    expect(isChartHash("#grafik?hisse=THYAO")).toBe(true);
    expect(isChartHash("#filtre")).toBe(false);
    expect(chartHash("THYAO")).toBe("#grafik?hisse=THYAO");
    expect(tickerFromHash("#grafik?hisse=thyao")).toBe("THYAO");
    expect(tickerFromHash("#grafik")).toBeNull();
  });

  it("requests daily stock bars unless a screener interval is selected", () => {
    expect(chartSpec("stock-THYAO")).toEqual({ symbol: "THYAO.IS", interval: "1d", range: "2y", aggregate: null });
    expect(chartSpec("stock-THYAO", "1d")).toEqual(chartSpec("stock-THYAO"));
    expect(chartSpec("stock-THYAO", "1wk")).toMatchObject({ interval: "1wk", aggregate: null });
    expect(chartSpec("stock-THYAO", "4h")).toMatchObject({ interval: "1h", aggregate: "4h" });
    expect(chartSpec("stock-THYAO", "1h")).toMatchObject({ interval: "1h", aggregate: null });
    expect(chartSpec("stock-THYAO", "2h")).toBeNull();
    expect(chartSpec("xu100-1h", "1wk")).toMatchObject({ symbol: "XU100.IS", interval: "1h" });
  });
});

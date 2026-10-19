import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { overlayFromReport, candleOption } from "../../chart/lib/candleChart";
import { backtestEmaCross, priceSeriesNote, projectStrategy, type EmaCrossSpec } from "../../chart/lib/emaCross";
import { adx, atr, rsi } from "../../chart/lib/indicators";
import { parseOhlcvCsv, type OhlcBar } from "../../chart/lib/parseOhlcv";
import { backtestRules, conditionSeries, emaCrossRules, groupSignal, UNUSED_RISK, type Condition, type LineSpec, type StrategyRules } from "../../chart/lib/strategyRules";
import { loadStrategies, parseStrategies, saveStrategies, serializeStrategies, type SavedStrategy } from "../../chart/lib/strategyStore";

function bar(index: number, open: number, high: number, low: number, close: number): OhlcBar {
  const hour = String(index).padStart(2, "0");
  return { time: `2026-01-01T${hour}:00:00+03:00`, label: hour, open, high, low, close, volume: null };
}

function flat(index: number, span: number, close = 10) {
  return bar(index, close, close + span / 2, close - span / 2, close);
}

const note = priceSeriesNote("csv");

function money(rules: Partial<StrategyRules> = {}): StrategyRules {
  return {
    name: "Deneme",
    capital: 1000,
    allocation: 1,
    feeRate: 0,
    slippageRate: 0,
    buyJoin: "and",
    sellJoin: "and",
    buy: [],
    sell: [],
    ...rules,
  };
}

describe("Wilder ATR ve ADX", () => {
  const bars = [
    bar(0, 9, 10, 8, 9),
    bar(1, 10, 11, 9, 10),
    bar(2, 11, 12, 10, 11),
    bar(3, 10, 11, 8, 9),
    bar(4, 12, 13, 11, 12),
    bar(5, 11, 12, 9, 10),
  ];

  it("ortalama gerçek aralığı Wilder ile sürdürür", () => {
    const values = atr(bars, 3);
    expect(values[1]).toBeNull();
    expect(values[2]).toBeCloseTo(2);
    expect(values[3]).toBeCloseTo(7 / 3);
    expect(values[4]).toBeCloseTo(26 / 9);
    expect(values[5]).toBeCloseTo((26 / 9) * 2 / 3 + 1);
  });

  it("ADX ilk değerini iki periyot sonra Wilder ortalamasıyla verir", () => {
    const values = adx(bars, 2);
    expect(values[2]).toBeNull();
    expect(values[3]).toBeCloseTo(200 / 3);
    expect(values[4]).toBeCloseTo(54.7619047619, 5);
    expect(values[5]).toBeCloseTo(44.0476190476, 5);
    expect(adx(bars.slice(0, 4), 2).every((value) => value == null)).toBe(true);
  });
});

describe("kodsuz koşullar", () => {
  it("EMA kesişim kuralı eski motorla aynı işlemi üretir", () => {
    const opens = [10, 10, 10, 11, 20, 8, 7];
    const closes = [10, 10, 10, 11, 13, 8, 6];
    const bars = opens.map((open, index) => bar(index, open, Math.max(open, closes[index]), Math.min(open, closes[index]), closes[index]));
    const spec: EmaCrossSpec = { fast: 2, slow: 3, capital: 1000, allocation: 1, feeRate: 0, slippageRate: 0 };
    const legacy = backtestEmaCross(bars, spec, note);
    const rules = backtestRules(bars, emaCrossRules(2, 3, spec), note);
    expect(rules.trades).toEqual(legacy.trades);
    expect(rules.equity).toEqual(legacy.equity);
    expect(rules.pending).toEqual(legacy.pending);
    expect(rules.realized).toBe(legacy.realized);
    expect(rules.totalCommission).toBe(legacy.totalCommission);
  });

  it("kapanış EMA üzerinde ve EMA kesişiminde sinyal verir", () => {
    const closes = [10, 10, 12, 12];
    const bars = closes.map((close, index) => bar(index, close, close, close, close));
    const above = backtestRules(bars, money({
      buy: [{ id: "above", kind: "price-ema", period: 2, direction: "above" }],
    }), note);
    expect(above.trades[0]).toMatchObject({ signalIndex: 2, entryIndex: 3, entryPrice: 12 });
    const cross = backtestRules(bars, money({
      buy: [{ id: "cross", kind: "price-ema", period: 2, direction: "cross-up" }],
    }), note);
    expect(cross.trades[0].signalIndex).toBe(2);
    const still = backtestRules(bars.slice(2), money({
      buy: [{ id: "above", kind: "price-ema", period: 2, direction: "cross-up" }],
    }), note);
    expect(still.trades).toEqual([]);
  });

  it("RSI eşiği yukarı kesilince sonraki açılışta alır", () => {
    const closes = [10, 9, 8, 9, 11];
    const bars = closes.map((close, index) => bar(index, close, close, close, close));
    const values = rsi(closes, 2);
    expect(values[2]).toBeCloseTo(0);
    expect(values[3]).toBeCloseTo(50);
    const report = backtestRules(bars, money({
      buy: [{ id: "rsi", kind: "rsi-cross", period: 2, level: 40, direction: "up" }],
    }), note);
    expect(report.ok).toBe(true);
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0].signalIndex).toBe(3);
    expect(report.trades[0].entryIndex).toBe(4);
    expect(report.trades[0].entryPrice).toBe(11);
    expect(values[1]).toBeNull();
  });

  it("ADX ve ATR eşikleri sıkı karşılaştırır", () => {
    const bars = [0, 1, 2, 3, 4, 5].map((index) => flat(index, index === 4 ? 10 : 1));
    const ranges = atr(bars, 1);
    expect(ranges[4]).toBeCloseTo(10);
    expect(ranges[3]).toBeCloseTo(1);
    const above = backtestRules(bars, money({
      buy: [{ id: "atr", kind: "atr-level", period: 1, level: 5, relation: "above" }],
      sell: [{ id: "low", kind: "atr-level", period: 1, level: 5, relation: "below" }],
    }), note);
    expect(above.trades[0].signalIndex).toBe(4);
    expect(above.trades[0].entryIndex).toBe(5);
    expect(above.pending?.side).toBe("sell");
    const equal = backtestRules(bars, money({
      buy: [{ id: "eq", kind: "atr-level", period: 1, level: 10, relation: "above" }],
    }), note);
    expect(equal.trades).toEqual([]);
  });

  it("VE tüm koşulları, VEYA herhangi birini aynı mumda ister", () => {
    const bars = [2, 4, 8, 1].map((span, index) => flat(index, span));
    const both: Condition[] = [
      { id: "wide", kind: "atr-level", period: 1, level: 3, relation: "above" },
      { id: "narrow", kind: "atr-level", period: 1, level: 6, relation: "below" },
    ];
    expect(conditionSeries(bars, both, "and")).toEqual([false, true, false, false]);
    expect(conditionSeries(bars, [
      { id: "high", kind: "atr-level", period: 1, level: 6, relation: "above" },
      { id: "low", kind: "atr-level", period: 1, level: 2, relation: "below" },
    ], "or")).toEqual([false, false, true, true]);
    const andReport = backtestRules(bars, money({ buy: both, buyJoin: "and" }), note);
    expect(andReport.trades.map((trade) => trade.signalIndex)).toEqual([1]);
    expect(andReport.trades).toHaveLength(1);
  });

  it("aynı mumda AL ve SAT varsa düzken alır, pozisyondayken satar", () => {
    const bars = [1, 2, 3, 4].map((index) => flat(index, 2));
    const always: Condition = { id: "always", kind: "atr-level", period: 1, level: 0, relation: "above" };
    const report = backtestRules(bars, money({ buy: [always], sell: [{ ...always, id: "exit" }] }), note);
    expect(report.trades).toHaveLength(2);
    expect(report.trades[0]).toMatchObject({ signalIndex: 0, entryIndex: 1, exitSignalIndex: 1, exitIndex: 2 });
    expect(report.trades[1].entryIndex).toBe(3);
    expect(report.trades[1].exitIndex).toBeNull();
    expect(report.openShares).toBe(report.trades[1].shares);
    expect(report.pending?.side).toBe("sell");
  });

  it("ısınma bitmeden ve son mumda emir açmaz", () => {
    const closes = [10, 10, 10, 11];
    const bars = closes.map((close, index) => bar(index, close, close, close, close));
    const report = backtestRules(bars, emaCrossRules(2, 3, { capital: 1000, allocation: 1, feeRate: 0, slippageRate: 0 }), note);
    expect(report.trades).toEqual([]);
    expect(report.pending).toEqual({ side: "buy", signalIndex: 3 });
    const cold = backtestRules(bars, money({
      buy: [{ id: "adx", kind: "adx-level", period: 14, level: 10, relation: "above" }],
    }), note);
    expect(cold.ok).toBe(true);
    expect(cold.trades).toEqual([]);
    expect(cold.pending).toBeNull();
  });

  it("gelecek mumu geçmiş sinyale karıştırmaz", () => {
    const bars = [1, 1, 8, 1, 1, 8, 1].map((span, index) => flat(index, span, 10 + index));
    const rules = money({
      buy: [{ id: "buy", kind: "atr-level", period: 1, level: 4, relation: "above" }],
      sell: [{ id: "sell", kind: "atr-level", period: 1, level: 4, relation: "below" }],
    });
    const full = backtestRules(bars, rules, note);
    const head = bars.slice(0, 4);
    const part = backtestRules(head, rules, note);
    expect(part.equity).toEqual(full.equity.slice(0, head.length));
    expect(atr(bars, 3)[2]).toBe(atr(head, 3)[2]);
    expect(part.trades.filter((trade) => trade.entryIndex < head.length - 1).map((trade) => trade.entryPrice))
      .toEqual(full.trades.filter((trade) => trade.entryIndex < head.length - 1).map((trade) => trade.entryPrice));
    expect(part.trades.some((trade) => trade.entryIndex >= head.length)).toBe(false);
  });

  it("komisyonu alış ve satışta düşer, nakiti eksiye indirmez", () => {
    const bars = [1, 2, 3].map((index) => flat(index, 2, 10));
    const report = backtestRules(bars, money({
      capital: 1000,
      feeRate: 0.0005,
      buy: [{ id: "buy", kind: "atr-level", period: 1, level: 0, relation: "above" }],
      sell: [{ id: "sell", kind: "atr-level", period: 1, level: 0, relation: "above" }],
    }), note);
    const trade = report.trades[0];
    expect(trade.shares * trade.entryPrice + trade.entryCommission).toBeLessThanOrEqual(1000 + 1e-8);
    expect(trade.entryCommission).toBeCloseTo(trade.shares * trade.entryPrice * 0.0005);
    expect(trade.exitCommission).toBeCloseTo((trade.shares * (trade.exitPrice ?? 0)) * 0.0005);
    expect(report.portfolio).toBeCloseTo(1000 + report.realized, 6);
  });

  it("replay gelecekteki işlemi ve kapanışı gizler", () => {
    const bars = [1, 2, 3, 4, 5].map((index) => flat(index, 2, 10));
    const report = backtestRules(bars, money({
      buy: [{ id: "buy", kind: "atr-level", period: 1, level: 0, relation: "above" }],
      sell: [{ id: "sell", kind: "price-ema", period: 1, direction: "below" }],
    }), note);
    expect(report.trades[0].entryIndex).toBeGreaterThan(0);
    const hidden = projectStrategy(report, bars, 0);
    expect(hidden.trades).toEqual([]);
    expect(hidden.equity).toHaveLength(1);
    expect(hidden.bars).toBe(1);
  });

  it("bozuk mumu, boş AL listesini ve aynı EMA periyodunu reddeder", () => {
    const bars = [flat(0, 1), flat(1, 1)];
    const broken = bars.map((item) => ({ ...item }));
    broken[1] = { ...broken[1], high: 1, low: 9, open: 10, close: 10 };
    expect(backtestRules(broken, money({ buy: [{ id: "a", kind: "atr-level", period: 1, level: 0, relation: "above" }] }), note).ok).toBe(false);
    expect(backtestRules(bars, money(), note).error).toMatch(/AL koşulu/);
    expect(backtestRules(bars, money({
      buy: [{ id: "same", kind: "ema-cross", fast: 20, slow: 20, direction: "up" }],
    }), note).ok).toBe(false);
  });
});

describe("NAS100 kural motoru", () => {
  const rows = parseOhlcvCsv(readFileSync("public/CAPITALCOM_NAS100_60.csv", "utf8"));
  const spec: EmaCrossSpec = { fast: 20, slow: 50, capital: 100_000, allocation: 1, feeRate: 0.0005, slippageRate: 0 };

  it("EMA 20/50 sonucunu eski motorla birebir tutar", () => {
    const legacy = backtestEmaCross(rows, spec, note);
    const rules = backtestRules(rows, emaCrossRules(20, 50, spec), note);
    expect(rules.trades).toEqual(legacy.trades);
    expect(rules.equity).toEqual(legacy.equity);
    expect(rules.pending).toEqual(legacy.pending);
    expect(rules.realized).toBeCloseTo(4586.6994, 4);
    expect(rules.totalCommission).toBeCloseTo(1062.3006, 4);
    expect(rules.completed).toBe(12);
    expect(rules.buyHold?.totalReturn).toBeCloseTo(legacy.buyHold?.totalReturn ?? 0, 8);
    expect(overlayFromReport(legacy)?.rsiPeriods).toBeUndefined();
    expect(overlayFromReport(rules)?.fastPeriod).toBe(20);
    expect(overlayFromReport(rules)?.slowPeriod).toBe(50);
  });
});

function line(name: LineSpec["name"], patch: Partial<LineSpec> = {}): LineSpec {
  return { name, period: 14, fast: 12, slow: 26, signal: 9, mult: 2, atrPeriod: 10, smooth: 3, line: "line", ...patch };
}

describe("karşılaştırma ve gruplar", () => {
  it("EMA kesişimi yeni karşılaştırma yoluyla eski motorla aynıdır", () => {
    const opens = [10, 10, 10, 11, 20, 8, 7];
    const closes = [10, 10, 10, 11, 13, 8, 6];
    const bars = opens.map((open, index) => bar(index, open, Math.max(open, closes[index]), Math.min(open, closes[index]), closes[index]));
    const legacy = backtestEmaCross(bars, { fast: 2, slow: 3, capital: 1000, allocation: 1, feeRate: 0, slippageRate: 0 }, note);
    const rules = backtestRules(bars, money({
      capital: 1000,
      buy: [{
        id: "b",
        kind: "compare",
        left: { source: "indicator", spec: line("ema", { period: 2 }) },
        op: "cross-up",
        right: { source: "indicator", spec: line("ema", { period: 3 }) },
        length: 1,
      }],
      sell: [{
        id: "s",
        kind: "compare",
        left: { source: "indicator", spec: line("ema", { period: 2 }) },
        op: "cross-down",
        right: { source: "indicator", spec: line("ema", { period: 3 }) },
        length: 1,
      }],
    }), note);
    expect(rules.trades).toEqual(legacy.trades);
    expect(rules.equity).toEqual(legacy.equity);
  });

  it("grupları önce kendi içinde, sonra dış operatörle hesaplar", () => {
    const bars = [2, 4, 8, 1].map((span, index) => flat(index, span));
    const above = (level: number, id: string): Condition => ({ id, kind: "atr-level", period: 1, level, relation: "above" });
    const below = (level: number, id: string): Condition => ({ id, kind: "atr-level", period: 1, level, relation: "below" });
    const grouped = groupSignal(bars, [
      { id: "g1", join: "or", conditions: [above(3, "a"), below(6, "b")] },
      { id: "g2", join: "and", conditions: [above(6, "c")] },
    ], "and");
    expect(grouped).toEqual([false, false, true, false]);
    const precedence = [false, true, true, false];
    expect(grouped).not.toEqual(precedence);
  });

  it("önceki ve son N mum kırılımı sinyal mumunu pencereye katmaz", () => {
    const bars = [
      bar(0, 10, 10, 10, 10),
      bar(1, 11, 12, 11, 11),
      bar(2, 11, 11, 11, 11),
      bar(3, 12, 13, 9, 13),
    ];
    const previous = conditionSeries(bars, [{ id: "p", kind: "compare", left: { source: "price", field: "close" }, op: "break-prev-high", right: { source: "constant", value: 0 }, length: 1 }], "and");
    expect(previous).toEqual([false, true, false, true]);
    const window = conditionSeries(bars, [{ id: "n", kind: "compare", left: { source: "price", field: "close" }, op: "break-highest", right: { source: "constant", value: 0 }, length: 2 }], "and");
    expect(window).toEqual([false, false, false, true]);
  });

  it("risk alanını okumaz ve büyük ile üzerinde aynı sıkı karşılaştırmadır", () => {
    const bars = [1, 2, 3, 4].map((index) => flat(index, 2, 10));
    const base = money({ buy: [{ id: "a", kind: "atr-level", period: 1, level: 0, relation: "above" }] });
    const withRisk = backtestRules(bars, { ...base, risk: UNUSED_RISK }, note);
    expect(withRisk.trades).toEqual(backtestRules(bars, base, note).trades);
    const level = { source: "constant" as const, value: 1 };
    const above = conditionSeries(bars, [{ id: "gt", kind: "compare", left: { source: "price", field: "close" }, op: "gt", right: level, length: 1 }], "and");
    const over = conditionSeries(bars, [{ id: "ab", kind: "compare", left: { source: "price", field: "close" }, op: "above", right: level, length: 1 }], "and");
    expect(above).toEqual(over);
    expect(above[0]).toBe(true);
  });
});

describe("strateji kaydı ve grafik", () => {
  it("kaydı yükler, bozuk kaydı atar", () => {
    const record: SavedStrategy = {
      id: "s1",
      name: "RSI dönüş",
      createdAt: "2026-10-18T00:00:00.000Z",
      updatedAt: "2026-10-18T00:00:00.000Z",
      direction: "long",
      buyJoin: "and",
      sellJoin: "or",
      buy: [
        { id: "b1", kind: "price-ema", period: 200, direction: "above" },
        { id: "b2", kind: "rsi-cross", period: 14, level: 30, direction: "up" },
        { id: "b3", kind: "adx-level", period: 14, level: 25, relation: "above" },
      ],
      sell: [{ id: "s", kind: "atr-level", period: 14, level: 2, relation: "below" }],
      capital: 100000,
      allocation: 100,
      fee: 0.05,
      slippage: 0,
    };
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    saveStrategies(storage, [record]);
    expect(loadStrategies(storage)).toEqual([record]);
    expect(parseStrategies(serializeStrategies([record]))).toEqual([record]);
    expect(parseStrategies("bozuk")).toEqual([]);
    expect(parseStrategies(JSON.stringify([record, { id: "x" }]))).toEqual([record]);
  });

  it("yalnızca kullanılan osilatör panelini ekler", () => {
    const rows = [1, 2, 3].map((index) => ({ ...flat(index, 1), volume: 100 }));
    const plain = candleOption(rows, 20, null, { fastPeriod: 20, slowPeriod: 50, marks: [] });
    const plainNames = (plain.series as Array<{ name?: string }>).map((series) => series.name);
    expect(plainNames).toEqual(["Fiyat", "EMA 20", "EMA 50", "Hacim"]);
    const osc = candleOption(rows, 20, null, { marks: [], emas: [200], rsiPeriods: [14], adxPeriods: [14], atrPeriods: [14] });
    const names = (osc.series as Array<{ name?: string }>).map((series) => series.name);
    expect(names).toContain("EMA 200");
    expect(names).toContain("RSI 14");
    expect(names).toContain("ADX 14");
    expect(names).toContain("ATR 14");
    expect(names).not.toContain("Hacim");
    expect(osc.grid).toHaveLength(4);
    const smaRules = backtestRules([flat(0, 1), flat(1, 1), flat(2, 1), flat(3, 1)], money({
      buy: [{ id: "sma", kind: "compare", left: { source: "price", field: "close" }, op: "above", right: { source: "indicator", spec: line("sma", { period: 2 }) }, length: 1 }],
    }), note);
    const overlay = overlayFromReport(smaRules);
    const drawn = candleOption([flat(0, 1), flat(1, 1), flat(2, 1)], 20, null, overlay);
    expect((drawn.series as Array<{ name?: string }>).map((series) => series.name)).toContain("SMA 2");
  });
});

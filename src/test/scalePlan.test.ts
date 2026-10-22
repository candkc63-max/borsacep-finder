import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { candleOption } from "../../chart/lib/candleChart";
import { backtestEmaCross, priceSeriesNote, projectStrategy, strategyMarks, type EmaCrossSpec, type StrategyIndicators } from "../../chart/lib/emaCross";
import { parseOhlcvCsv, type OhlcBar } from "../../chart/lib/parseOhlcv";
import { inactiveSettings, type RiskSettings } from "../../chart/lib/riskPlan";
import { executeScaledLong } from "../../chart/lib/scaleBacktest";
import { atr, ema } from "../../chart/lib/indicators";
import { addTriggered, inactiveScale, isScaleActive, scaleExitShares, splitEntryShares, type ScaleSettings } from "../../chart/lib/scalePlan";
import { backtestRules, emaCrossRules } from "../../chart/lib/strategyRules";
import { parseStrategies, type SavedStrategy } from "../../chart/lib/strategyStore";

function bar(index: number, open: number, high: number, low: number, close: number): OhlcBar {
  const hour = String(index).padStart(2, "0");
  return { time: `2026-02-02T${hour}:00:00+03:00`, label: hour, open, high, low, close, volume: null };
}

const note = priceSeriesNote("csv");
const indicators: StrategyIndicators = { emas: [], rsi: [], adx: [], atr: [] };

function money(patch: Partial<EmaCrossSpec> = {}): EmaCrossSpec {
  return { fast: 1, slow: 2, capital: 100_000, allocation: 1, feeRate: 0, slippageRate: 0, ...patch };
}

function risk(patch: Partial<RiskSettings> = {}): RiskSettings {
  return { ...inactiveSettings(), size: "shares", shares: 100, ...patch };
}

function scale(patch: Partial<ScaleSettings> = {}): ScaleSettings {
  return {
    ...inactiveScale(),
    enabled: true,
    trigger: "percent",
    triggerPercent: 0.01,
    entryRatios: [0.25, 0.5, 0.25],
    ...patch,
  };
}

function run(bars: OhlcBar[], settings: ScaleSettings, position = risk(), signal: (index: number, inPosition: boolean) => "buy" | "sell" | null = (index, inPosition) => (!inPosition && index === 0 ? "buy" : null)) {
  return executeScaledLong(bars, money(), note, signal, indicators, position, settings);
}

describe("kademe hesabı", () => {
  it("giriş ve çıkış adetlerini tam sayıya böler", () => {
    expect(splitEntryShares(100, [0.25, 0.5, 0.25])).toEqual([25, 50, 25]);
    expect(splitEntryShares(10, [0.25, 0.5, 0.25])).toEqual([2, 5, 3]);
    expect(scaleExitShares(100, 0.25, 100, false)).toBe(25);
    expect(scaleExitShares(100, 0.35, 75, false)).toBe(35);
    expect(scaleExitShares(100, 0.4, 40, true)).toBe(40);
    expect(scaleExitShares(10, 0.25, 10, false)).toBe(2);
    expect(isScaleActive(inactiveScale())).toBe(false);
  });

  it("artırma sinyali kapanmış mumdaki EMA, zirve ve ATR bilgisini kullanır", () => {
    const bars = [bar(0, 10, 10, 10, 10), bar(1, 10, 12, 10, 11), bar(2, 14, 30, 11, 14)];
    const closes = bars.map((item) => item.close);
    const settings = scale({ trigger: "ema", emaFast: 1, emaSlow: 2 });
    const fast = ema(closes, 1);
    const slow = ema(closes, 2);
    expect(addTriggered(settings, bars, 1, 10, 1, fast, slow, [])).toBe(false);
    expect(addTriggered({ ...settings, trigger: "break-high" }, bars, 2, 10, 1, [], [], [])).toBe(true);
    const series = atr(bars, 1);
    expect(addTriggered({ ...settings, trigger: "atr", atrMult: 0.2 }, bars, 2, 10, 1, [], [], series)).toBe(true);
    expect(addTriggered({ ...settings, trigger: "atr", atrMult: 1 }, bars, 2, 10, 1, [], [], series)).toBe(false);
  });
});

describe("kademeli long", () => {
  it("iki ve üç aşamada girer ve ortalama maliyeti hesaplar", () => {
    const two = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 101),
      bar(2, 102, 102, 102, 102),
    ], scale({ entryRatios: [0.5, 0.5] }));
    expect(two.trades).toHaveLength(1);
    expect(two.trades[0].legs?.entries.map((leg) => [leg.shares, leg.price])).toEqual([[50, 100], [50, 102]]);
    expect(two.trades[0].entryPrice).toBeCloseTo(101);
    expect(two.trades[0].maxShares).toBe(100);
    expect(two.completed).toBe(0);

    const three = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 101),
      bar(2, 102, 103.02, 102, 103.02),
      bar(3, 104, 104, 104, 104),
    ], scale());
    expect(three.trades[0].legs?.entries.map((leg) => leg.shares)).toEqual([25, 50, 25]);
    expect(three.trades[0].legs?.entries.map((leg) => leg.price)).toEqual([100, 102, 104]);
    expect(three.trades[0].entryPrice).toBeCloseTo(102);
    expect(three.maxPosition).toBe(100);
  });

  it("iki ve üç aşamada referans adede göre kâr alır", () => {
    const bars = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 100, 100),
      bar(2, 100, 103, 100, 103),
      bar(3, 103, 106, 103, 106),
      bar(4, 106, 110, 106, 110),
    ];
    const three = run(bars, scale({
      entryRatios: [1],
      exits: [
        { profitPercent: 0.03, ratio: 0.25 },
        { profitPercent: 0.06, ratio: 0.35 },
        { profitPercent: 0.1, ratio: 0.4 },
      ],
    }));
    expect(three.completed).toBe(1);
    expect(three.trades).toHaveLength(1);
    const exits = three.trades[0].legs?.exits ?? [];
    expect(exits.map((leg) => leg.shares)).toEqual([25, 35, 40]);
    expect(exits.map((leg) => leg.price)).toEqual([103, 106, expect.closeTo(110, 8)]);
    expect(three.trades[0].realized).toBeCloseTo(25 * 3 + 35 * 6 + 40 * 10);
    const two = run(bars.slice(0, 4), scale({
      entryRatios: [1],
      exits: [
        { profitPercent: 0.03, ratio: 0.5 },
        { profitPercent: 0.06, ratio: 0.5 },
      ],
    }));
    expect(two.trades[0].legs?.exits.map((leg) => leg.shares)).toEqual([50, 50]);
    expect(two.realized).toBeCloseTo(50 * 3 + 50 * 6);
  });

  it("pozisyon artırmayı toplam risk sınırı keser", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 101),
      bar(2, 102, 102, 102, 102),
    ], scale({ entryRatios: [0.5, 0.5], maxRiskPercent: 0.0005 }), risk({ stop: "percent", stopPercent: 0.05, size: "shares", shares: 20 }));
    expect(report.trades[0].legs?.entries.map((leg) => leg.shares)).toEqual([10]);
    expect(report.maxOpenRisk).toBeLessThanOrEqual(10000 * 0.005 + 1e-6);
  });

  it("parçalı satıştan sonra kalan stopu çalışır", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 100, 100),
      bar(2, 100, 103, 100, 103),
      bar(3, 100, 100, 90, 95),
    ], scale({
      entryRatios: [1],
      exits: [
        { profitPercent: 0.03, ratio: 0.5 },
        { profitPercent: 0.1, ratio: 0.5 },
      ],
    }), risk({ stop: "percent", stopPercent: 0.05 }));
    expect(report.completed).toBe(1);
    expect(report.trades[0].legs?.exits.map((leg) => [leg.reason, leg.shares, leg.price])).toEqual([
      ["target", 50, 103],
      ["stop", 50, 95],
    ]);
    expect(report.realized).toBeCloseTo(50 * 3 + 50 * (95 - 100));
    expect(report.stopExits).toBe(1);
  });

  it("komisyon ve kaymayı her kademede düşer", () => {
    const report = executeScaledLong([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 103, 100, 103),
      bar(2, 102, 102, 102, 102),
    ], money({ feeRate: 0.01, slippageRate: 0.01 }), note, (index, inPosition) => (!inPosition && index === 0 ? "buy" : null), indicators, risk(), scale({ entryRatios: [0.5, 0.5] }));
    const entries = report.trades[0].legs?.entries ?? [];
    expect(entries[0].price).toBeCloseTo(101);
    expect(entries[0].commission).toBeCloseTo(50 * 101 * 0.01);
    expect(entries[1].price).toBeCloseTo(102 * 1.01);
    expect(entries[1].commission).toBeCloseTo(50 * entries[1].price * 0.01);
    expect(report.totalCommission).toBeCloseTo(entries[0].commission + entries[1].commission);
    expect(report.totalSlippage).toBeGreaterThan(0);
    expect(report.equity.every((value) => value >= -1e-6)).toBe(true);
  });

  it("nakit ikinci aşamayı küçültür", () => {
    const report = executeScaledLong([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 101),
      bar(2, 200, 200, 200, 200),
    ], money({ capital: 4000 }), note, (index, inPosition) => (!inPosition && index === 0 ? "buy" : null), indicators, risk(), scale({ entryRatios: [0.25, 0.75] }));
    const shares = report.trades[0].legs?.entries.map((leg) => leg.shares) ?? [];
    expect(shares[0]).toBe(10);
    expect(shares[1]).toBe(15);
    expect(shares.reduce((total, value) => total + value, 0) * 200).toBeLessThanOrEqual(4000 + 10 * 100);
  });

  it("aynı mumda stop ve hedef varsa stop kazanır", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 110, 90, 100),
    ], scale({
      entryRatios: [1],
      exits: [{ profitPercent: 0.03, ratio: 1 }],
    }), risk({ stop: "percent", stopPercent: 0.05 }));
    expect(report.trades[0].legs?.exits).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({ exitReason: "stop", exitPrice: 95 });
    expect(report.trades[0].legs?.exits[0].reason).toBe("stop");
  });

  it("replay sonraki kademeyi ve hedefi göstermez", () => {
    const bars = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 101),
      bar(2, 102, 103.02, 102, 103.02),
      bar(3, 104, 110, 104, 108),
    ];
    const report = run(bars, scale({
      exits: [{ profitPercent: 0.03, ratio: 1 }],
    }));
    const early = projectStrategy(report, bars, 1);
    expect(early.trades[0].legs?.entries).toHaveLength(1);
    expect(early.trades[0].entryPrice).toBeCloseTo(100);
    expect(early.trades[0].legs?.entries.some((leg) => leg.price > 100)).toBe(false);
    expect(early.pending?.side).toBe("buy");
    const marks = strategyMarks(early.trades);
    expect(marks).toHaveLength(1);
    expect(marks[0].average).toBeCloseTo(100);
    expect(marks.some((mark) => (mark.entryPrice ?? 0) > 101)).toBe(false);
    const option = candleOption(bars.slice(0, 2), 20, null, { marks });
    const lines = (option.series as Array<{ markLine?: { data?: Array<{ yAxis?: number }> } }>)[0].markLine?.data ?? [];
    expect(lines.some((line) => line.yAxis != null && Math.abs(line.yAxis - 100) < 1e-6)).toBe(true);
    const prefix = run(bars.slice(0, 2), scale());
    expect(prefix.equity).toEqual(report.equity.slice(0, 2));
  });

  it("kapalı kademe NAS100 EMA 20/50 sonucunu değiştirmez", () => {
    const rows = parseOhlcvCsv(readFileSync("public/CAPITALCOM_NAS100_60.csv", "utf8"));
    const legacy = backtestEmaCross(rows, {
      fast: 20,
      slow: 50,
      capital: 100_000,
      allocation: 1,
      feeRate: 0.0005,
      slippageRate: 0,
    }, note);
    const plain = backtestRules(rows, { ...emaCrossRules(), scale: inactiveScale() }, note);
    expect(plain.trades).toEqual(legacy.trades);
    expect(plain.equity).toEqual(legacy.equity);
    expect(plain.realized).toBeCloseTo(4586.6994, 4);
    expect(plain.totalReturn).toBeCloseTo(0.045866994, 6);
    expect(plain.maxDrawdown).toBeCloseTo(4611.2268, 4);
    expect(plain.totalCommission).toBeCloseTo(1062.3006, 4);
    expect(plain.completed).toBe(12);
  });
});

describe("kademe kaydı", () => {
  it("kademe alanı olmayan eski kaydı yükler", () => {
    const record: SavedStrategy = {
      id: "s1",
      name: "Eski",
      createdAt: "2026-10-18T00:00:00.000Z",
      updatedAt: "2026-10-18T00:00:00.000Z",
      direction: "long",
      buyJoin: "and",
      sellJoin: "and",
      buy: [{ id: "b", kind: "ema-cross", fast: 20, slow: 50, direction: "up" }],
      sell: [{ id: "s", kind: "ema-cross", fast: 20, slow: 50, direction: "down" }],
      capital: 100000,
      allocation: 100,
      fee: 0.05,
      slippage: 0,
    };
    expect(parseStrategies(JSON.stringify([record]))).toEqual([record]);
    expect(parseStrategies(JSON.stringify([{ ...record, scale: { enabled: "evet" } }]))).toEqual([record]);
  });
});

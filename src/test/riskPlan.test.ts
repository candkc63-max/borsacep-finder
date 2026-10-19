import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { candleOption } from "../../chart/lib/candleChart";
import { backtestEmaCross, priceSeriesNote, projectStrategy, strategyMarks, type EmaCrossSpec, type StrategyIndicators } from "../../chart/lib/emaCross";
import { atr } from "../../chart/lib/indicators";
import { parseOhlcvCsv, type OhlcBar } from "../../chart/lib/parseOhlcv";
import { executeManagedLong } from "../../chart/lib/riskBacktest";
import {
  defaultRiskDraft,
  inactiveSettings,
  initialStop,
  initialTarget,
  isRiskActive,
  nextTrailStop,
  protectiveExit,
  riskBudgetShares,
  riskError,
  settingsFromDraft,
  type RiskSettings,
} from "../../chart/lib/riskPlan";
import { backtestRules, emaCrossRules, UNUSED_RISK } from "../../chart/lib/strategyRules";
import { parseStrategies, type SavedStrategy } from "../../chart/lib/strategyStore";

function bar(index: number, open: number, high: number, low: number, close: number): OhlcBar {
  const hour = String(index).padStart(2, "0");
  return { time: `2026-01-02T${hour}:00:00+03:00`, label: hour, open, high, low, close, volume: null };
}

const note = priceSeriesNote("csv");
const indicators: StrategyIndicators = { emas: [], rsi: [], adx: [], atr: [] };

function spec(patch: Partial<EmaCrossSpec> = {}): EmaCrossSpec {
  return { fast: 1, slow: 2, capital: 10_000, allocation: 1, feeRate: 0, slippageRate: 0, ...patch };
}

function risk(patch: Partial<RiskSettings> = {}): RiskSettings {
  return { ...inactiveSettings(), ...patch };
}

function run(bars: OhlcBar[], settings: RiskSettings, money = spec(), signal: (index: number, inPosition: boolean) => "buy" | "sell" | null = (index, inPosition) => (!inPosition && index === 0 ? "buy" : null)) {
  return executeManagedLong(bars, money, note, signal, indicators, settings);
}

describe("risk seviyeleri", () => {
  const bars = [bar(0, 10, 14, 10, 10), bar(1, 20, 30, 18, 22), bar(2, 22, 22, 16, 20)];

  it("sabit yüzde stop girişin altındadır", () => {
    const level = initialStop(risk({ stop: "percent", stopPercent: 0.01 }), bars, 1, 100, []);
    expect(level).toEqual({ ok: true, price: 99 });
  });

  it("ATR stopu giriş mumundan önceki kapanmış ATR değerini kullanır", () => {
    const series = atr(bars, 1);
    expect(series[0]).toBe(4);
    expect(series[1]).toBe(20);
    const level = initialStop(risk({ stop: "atr", atrPeriod: 1, atrMult: 1 }), bars, 1, 20, series);
    expect(level).toEqual({ ok: true, price: 16 });
  });

  it("swing stop giriş mumunu pencereye katmaz", () => {
    const level = initialStop(risk({ stop: "swing", swingBars: 2 }), bars, 2, 22, []);
    expect(level).toEqual({ ok: true, price: 10 });
  });

  it("risk ödül başlangıç stop mesafesinden hesaplanır", () => {
    expect(initialTarget(risk({ target: "rr", rewardMultiple: 2 }), 100, 90)).toEqual({ ok: true, price: 120 });
    expect(initialTarget(risk({ target: "rr", rewardMultiple: 1.5 }), 100, 90)).toEqual({ ok: true, price: 115 });
    expect(initialTarget(risk({ target: "rr", rewardMultiple: 2 }), 100, null).ok).toBe(false);
  });

  it("risk yüzdesi komisyon, kayma ve nakitle sınırlanır", () => {
    expect(riskBudgetShares(10_000, 0.01, 100, 95, 0, 0, 10_000)).toBe(20);
    expect(riskBudgetShares(10_000, 0.01, 100, 95, 0.001, 0, 10_000)).toBe(19);
    expect(riskBudgetShares(1_000, 0.5, 100, 99, 0, 0, 1_000)).toBe(10);
    expect(riskBudgetShares(50, 0.01, 100, 99, 0, 0, 50)).toBe(0);
  });

  it("iz süren stop long için aşağı inmez ve aynı mumun ATR'ı boşsa yerinde kalır", () => {
    const settings = risk({ trail: "atr", trailAtrMult: 1 });
    expect(nextTrailStop(90, 100, settings, 30)).toBe(90);
    expect(nextTrailStop(90, 110, settings, 5)).toBe(105);
    expect(nextTrailStop(105, 110, settings, null)).toBe(105);
  });

  it("aynı mumda stop ve hedef varsa stop önce gelir, boşluk açılışta dolar", () => {
    expect(protectiveExit({ open: 100, high: 120, low: 90 }, 95, 110)).toEqual({ price: 95, reason: "stop" });
    expect(protectiveExit({ open: 90, high: 92, low: 88 }, 95, 110)).toEqual({ price: 90, reason: "gap-stop" });
    expect(protectiveExit({ open: 115, high: 116, low: 90 }, 95, 110)).toEqual({ price: 115, reason: "gap-target" });
  });

  it("stop yokken risk ödül ve risk yüzdesi reddedilir", () => {
    expect(riskError(risk({ target: "rr" }))).toMatch(/başlangıç stopu/);
    expect(riskError(risk({ size: "risk" }))).toMatch(/başlangıç stopu/);
    expect(riskError(undefined)).toBeNull();
    expect(isRiskActive(undefined)).toBe(false);
    expect(isRiskActive(inactiveSettings())).toBe(false);
    expect(isRiskActive(settingsFromDraft(defaultRiskDraft()))).toBe(false);
  });
});

describe("riskli long backtest", () => {
  it("sabit yüzde stopu stop fiyatında kapatır", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 98, 100),
      bar(2, 100, 100, 100, 100),
    ], risk({ stop: "percent", stopPercent: 0.01 }));
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({ entryIndex: 1, entryPrice: 100, shares: 100, exitIndex: 1, exitPrice: 99, exitReason: "stop", realized: -100 });
    expect(report.portfolio).toBe(9900);
    expect(report.avgLoss).toBe(-100);
    expect(report.avgWin).toBeNull();
    expect(report.maxConsecutiveLosses).toBe(1);
    expect(report.totalCommission).toBe(0);
  });

  it("ATR stop önceki kapanmış değeri kullanır", () => {
    const report = run([
      bar(0, 10, 14, 10, 10),
      bar(1, 20, 30, 20, 20),
      bar(2, 20, 20, 15, 16),
    ], risk({ stop: "atr", atrPeriod: 1, atrMult: 1 }));
    expect(report.trades[0]).toMatchObject({ entryPrice: 20, initialStop: 16, exitPrice: 16, exitReason: "stop", exitIndex: 2 });
  });

  it("risk yüzdesiyle adet hesaplar", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 100, 100),
      bar(2, 100, 100, 90, 95),
    ], risk({ stop: "percent", stopPercent: 0.05, size: "risk", riskPercent: 0.01 }));
    expect(report.trades[0].shares).toBe(20);
    expect(report.trades[0].exitReason).toBe("stop");
    expect(report.trades[0].exitPrice).toBeCloseTo(95);
    expect(report.trades[0].realized).toBeCloseTo(-100);
  });

  it("aynı mumda stop ve hedef stopta kapanır", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 120, 90, 100),
    ], risk({ stop: "price", stopPrice: 95, target: "price", targetPrice: 110 }));
    expect(report.trades[0]).toMatchObject({ exitPrice: 95, exitReason: "stop" });
    expect(report.stopExits).toBe(1);
    expect(report.targetExits).toBe(0);
  });

  it("açılış stopun ötesine boşluk yaparsa açılışta satar", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 100),
      bar(2, 90, 92, 88, 91),
    ], risk({ stop: "price", stopPrice: 95 }));
    expect(report.trades[0]).toMatchObject({ exitIndex: 2, exitPrice: 90, exitReason: "gap-stop", realized: -1000 });
  });

  it("hedefe boşluk açılışta ve hedef fiyatta kapanır", () => {
    const gap = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 100),
      bar(2, 130, 132, 129, 131),
    ], risk({ stop: "price", stopPrice: 90, target: "rr", rewardMultiple: 2 }));
    expect(gap.trades[0]).toMatchObject({ initialTarget: 120, exitPrice: 130, exitReason: "gap-target" });
    const touch = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 121, 99, 110),
    ], risk({ stop: "price", stopPrice: 90, target: "rr", rewardMultiple: 2 }));
    expect(touch.trades[0]).toMatchObject({ exitPrice: 120, exitReason: "target" });
    expect(touch.avgRewardRisk).toBeCloseTo(2);
  });

  it("iz süren stop yalnız lehe ilerler ve kurulduğu mumda işlemez", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 110, 96, 108),
      bar(2, 108, 109, 105, 107),
      bar(3, 107, 108, 100, 101),
    ], risk({ stop: "percent", stopPercent: 0.1, trail: "percent", trailPercent: 0.05 }));
    const trade = report.trades[0];
    expect(trade.initialStop).toBeCloseTo(90);
    expect(trade.stopPath?.map((point) => point.stop)).toEqual([90, 104.5]);
    expect(trade.exitIndex).toBe(3);
    expect(trade.exitPrice).toBeCloseTo(104.5);
    expect(trade.exitReason).toBe("stop");
    const atrTrail = run([
      bar(0, 10, 10, 10, 10),
      bar(1, 100, 100, 100, 100),
      bar(2, 100, 100, 100, 100),
    ], risk({ stop: "percent", stopPercent: 0.1, trail: "atr", trailAtrPeriod: 1, trailAtrMult: 1 }));
    const path = atrTrail.trades[0].stopPath?.map((point) => point.stop) ?? [];
    expect(path[0]).toBeCloseTo(90);
    expect(path).not.toContain(10);
    for (let index = 1; index < path.length; index += 1) expect(path[index]).toBeGreaterThanOrEqual(path[index - 1] - 1e-9);
  });

  it("stop veya hedef aynı mumda yeni giriş açmaz", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 90, 95),
      bar(2, 95, 96, 94, 95),
      bar(3, 95, 96, 94, 95),
    ], risk({ stop: "percent", stopPercent: 0.01 }), spec(), (index, inPosition) => (inPosition ? null : "buy"));
    expect(report.trades.map((trade) => trade.entryIndex)).toEqual([1, 3]);
    expect(report.trades[0].exitIndex).toBe(1);
  });

  it("sinyal satışı açılışta dolar, açılış stopu aşmıyorsa gün içi stopu beklemez", () => {
    const sold = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 100),
      bar(2, 100, 101, 100, 100),
      bar(3, 100, 100, 80, 90),
    ], risk({ stop: "price", stopPrice: 90 }), spec(), (index, inPosition) => {
      if (!inPosition && index === 0) return "buy";
      if (inPosition && index === 2) return "sell";
      return null;
    });
    expect(sold.trades[0]).toMatchObject({ exitIndex: 3, exitPrice: 100, exitReason: "signal" });
    const gapped = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 100, 100),
      bar(2, 100, 101, 100, 100),
      bar(3, 80, 82, 79, 81),
    ], risk({ stop: "price", stopPrice: 90 }), spec(), (index, inPosition) => {
      if (!inPosition && index === 0) return "buy";
      if (inPosition && index === 2) return "sell";
      return null;
    });
    expect(gapped.trades[0]).toMatchObject({ exitPrice: 80, exitReason: "gap-stop" });
  });

  it("son mumdaki sinyal emir olmaz", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 100, 100),
    ], risk({ stop: "percent", stopPercent: 0.01 }), spec(), (index) => (index === 1 ? "buy" : null));
    expect(report.trades).toEqual([]);
    expect(report.pending).toEqual({ side: "buy", signalIndex: 1 });
  });

  it("komisyon ve kayma her çıkışta tutarlıdır", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 98, 100),
    ], risk({ stop: "percent", stopPercent: 0.01 }), spec({ feeRate: 0.01, slippageRate: 0.01 }));
    const trade = report.trades[0];
    expect(trade.entryPrice).toBeCloseTo(101);
    expect(trade.initialStop).toBeCloseTo(99.99);
    expect(trade.exitPrice).toBeCloseTo(99.99 * 0.99);
    expect(trade.shares).toBe(98);
    expect(trade.entryCommission).toBeCloseTo(98 * 101 * 0.01);
    expect(trade.exitCommission).toBeCloseTo(98 * trade.exitPrice! * 0.01);
    expect(trade.realized).toBeCloseTo((trade.exitPrice! - trade.entryPrice) * 98 - trade.entryCommission - (trade.exitCommission ?? 0));
    expect(report.totalCommission).toBeCloseTo(trade.entryCommission + (trade.exitCommission ?? 0));
    expect(report.totalSlippage).toBeCloseTo(98 * 1 + 98 * (99.99 - trade.exitPrice!));
    expect(report.equity.every((value) => value >= -1e-6)).toBe(true);
  });

  it("yetersiz sermayede işlem açmaz", () => {
    const report = run([
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 100, 100),
    ], risk({ stop: "percent", stopPercent: 0.01 }), spec({ capital: 50 }));
    expect(report.trades).toEqual([]);
    expect(report.portfolio).toBe(50);
    expect(report.equity).toEqual([50, 50]);
  });

  it("gelecek mumu kullanmaz", () => {
    const bars = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 110, 100, 108),
      bar(2, 108, 112, 107, 110),
      bar(3, 110, 110, 80, 90),
    ];
    const settings = risk({ stop: "percent", stopPercent: 0.1, trail: "percent", trailPercent: 0.05 });
    const full = run(bars, settings);
    const prefix = run(bars.slice(0, 3), settings);
    expect(prefix.equity).toEqual(full.equity.slice(0, 3));
    expect(prefix.trades[0].entryPrice).toBe(full.trades[0].entryPrice);
    expect(prefix.trades[0].exitIndex).toBeNull();
    expect(full.trades[0].exitIndex).toBe(3);
    expect(prefix.trades[0].stopPath).toEqual(full.trades[0].stopPath?.filter((point) => point.index <= 2));
  });

  it("replay yalnız o ana kadarki stopu gösterir", () => {
    const bars = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 110, 100, 108),
      bar(2, 108, 120, 106, 118),
      bar(3, 118, 118, 110, 112),
    ];
    const report = run(bars, risk({ stop: "percent", stopPercent: 0.1, trail: "percent", trailPercent: 0.05 }));
    const early = projectStrategy(report, bars, 1);
    const open = early.trades[0];
    expect(open.exitIndex).toBeNull();
    expect(open.stopPath?.at(-1)?.stop).toBeCloseTo(104.5);
    expect(open.stopPath?.some((point) => point.stop > 110)).toBe(false);
    expect(strategyMarks(early.trades)[0].stop).toBeCloseTo(104.5);
    expect(strategyMarks(early.trades)[0].target).toBeNull();
    const option = candleOption(bars.slice(0, 2), 20, null, { marks: strategyMarks(early.trades) });
    const markLine = (option.series as Array<{ markLine?: { data?: Array<{ yAxis?: number }> } }>)[0].markLine?.data ?? [];
    expect(markLine.some((line) => line.yAxis != null && Math.abs(line.yAxis - 104.5) < 1e-6)).toBe(true);
    expect(markLine.some((line) => line.yAxis != null && line.yAxis > 110)).toBe(false);
  });

  it("kapalı risk NAS100 EMA 20/50 sonucunu değiştirmez", () => {
    const rows = parseOhlcvCsv(readFileSync("public/CAPITALCOM_NAS100_60.csv", "utf8"));
    const legacy = backtestEmaCross(rows, {
      fast: 20,
      slow: 50,
      capital: 100_000,
      allocation: 1,
      feeRate: 0.0005,
      slippageRate: 0,
    }, note);
    const plain = backtestRules(rows, emaCrossRules(), note);
    const inactive = backtestRules(rows, { ...emaCrossRules(), risk: UNUSED_RISK }, note);
    expect(plain.trades).toEqual(legacy.trades);
    expect(plain.equity).toEqual(legacy.equity);
    expect(inactive.trades).toEqual(legacy.trades);
    expect(inactive.equity).toEqual(legacy.equity);
    expect(inactive.pending).toEqual(legacy.pending);
    expect(inactive.realized).toBeCloseTo(4586.6994, 4);
    expect(inactive.totalReturn).toBeCloseTo(0.045866994, 6);
    expect(inactive.maxDrawdown).toBeCloseTo(4611.2268, 4);
    expect(inactive.totalCommission).toBeCloseTo(1062.3006, 4);
    expect(inactive.completed).toBe(12);
    expect(inactive.totalSlippage).toBe(0);
    expect(inactive.stopExits).toBe(0);
  });
});

describe("risk kaydı", () => {
  it("risk alanı olmayan eski kaydı yükler", () => {
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
    const withRisk: SavedStrategy = { ...record, risk: { ...defaultRiskDraft(), stop: "percent", stopPercent: 1 } };
    expect(parseStrategies(JSON.stringify([withRisk]))[0].risk?.stop).toBe("percent");
    expect(parseStrategies(JSON.stringify([{ ...record, risk: { stop: "yok" } }]))).toEqual([record]);
  });
});

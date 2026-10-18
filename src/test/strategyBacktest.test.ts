import { describe, expect, it } from "vitest";
import { barExit, tradeNet, type PriceBar } from "../../chart/lib/manualBacktest";
import { atr, backtestStrategy, type StrategySpec } from "../../chart/lib/strategyBacktest";

function bar(close: number, extra: Partial<PriceBar> = {}): PriceBar {
  return {
    open: extra.open ?? close,
    high: extra.high ?? close,
    low: extra.low ?? close,
    close: extra.close ?? close,
  };
}

function spec(partial: Partial<StrategySpec> = {}): StrategySpec {
  return {
    fast: 2,
    slow: 3,
    mode: "long",
    stop: { kind: "fixed", percent: 0.05 },
    size: 1,
    capital: 10000,
    feeRate: 0.001,
    slippageRate: 0,
    ...partial,
  };
}

const rise = [
  bar(10), bar(10), bar(10), bar(10),
  bar(12),
  bar(14, { open: 14, high: 14.2, low: 13.8 }),
  bar(16),
];

describe("strategy backtest", () => {
  it("buys the next open after an EMA cross and ignores the signal bar", () => {
    const report = backtestStrategy(rise, spec());
    expect(report.error).toBeNull();
    expect(report.trades[0]?.signalIndex).toBe(4);
    expect(report.trades[0]?.entryIndex).toBe(5);
    expect(report.trades[0]?.entry).toBe(14);
    expect(report.trades[0]?.direction).toBe("long");
  });

  it("does not open a trade on a cross that has no following bar", () => {
    const report = backtestStrategy(rise.slice(0, 5), spec());
    expect(report.trades).toHaveLength(0);
  });

  it("keeps earlier fills when future bars are appended", () => {
    const partial = backtestStrategy(rise.slice(0, 6), spec());
    const full = backtestStrategy([...rise, bar(18), bar(20)], spec());
    expect(partial.trades[0]?.entry).toBe(full.trades[0]?.entry);
    expect(partial.trades[0]?.entryIndex).toBe(full.trades[0]?.entryIndex);
    expect(partial.trades[0]?.stop).toBe(full.trades[0]?.stop);
  });

  it("stops on the entry bar at the shared stop price", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 100, high: 101, low: 90, close: 100 }),
    ];
    const report = backtestStrategy(bars, spec());
    const trade = report.trades[0];
    expect(trade?.entry).toBe(100);
    expect(trade?.stop).toBeCloseTo(95);
    expect(trade?.reason).toBe("stop");
    expect(trade?.exit).toBeCloseTo(95);
    expect(trade?.net).toBeCloseTo(tradeNet("long", 100, 95, 1, 0.001));
    expect(barExit("long", 95, Number.POSITIVE_INFINITY, bars[5])?.price).toBe(95);
  });

  it("fills a later gap at the open and then applies adverse slippage inside the bar", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 100, high: 101, low: 99, close: 100 }),
      bar(90, { open: 80, high: 82, low: 79, close: 81 }),
    ];
    const report = backtestStrategy(bars, spec({ slippageRate: 0.01 }));
    const trade = report.trades[0];
    expect(trade?.entry).toBeCloseTo(101);
    expect(trade?.reason).toBe("gap-stop");
    expect(trade?.exit).toBeCloseTo(79.2);
    expect(trade?.net).toBeCloseTo(tradeNet("long", 101, 79.2, 1, 0.001));
  });

  it("caps exit slippage at the bar low", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 100, high: 101, low: 99, close: 100 }),
      bar(90, { open: 80, high: 82, low: 79.5, close: 81 }),
    ];
    const report = backtestStrategy(bars, spec({ slippageRate: 0.02 }));
    expect(report.trades[0]?.exit).toBeCloseTo(79.5);
  });

  it("scales the result with position size", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 100, high: 101, low: 90, close: 100 }),
    ];
    const single = backtestStrategy(bars, spec());
    const doubled = backtestStrategy(bars, spec({ size: 2 }));
    expect(doubled.trades[0]?.net).toBeCloseTo((single.trades[0]?.net ?? 0) * 2);
  });

  it("uses an ATR distance known on the signal bar", () => {
    const bars = [
      bar(10, { high: 11, low: 9 }),
      bar(10, { high: 11, low: 9 }),
      bar(10, { high: 11, low: 9 }),
      bar(10, { high: 11, low: 9 }),
      bar(12, { high: 13, low: 11 }),
      bar(14, { open: 100, high: 130, low: 70, close: 100 }),
    ];
    const ranges = atr(bars, 3);
    const report = backtestStrategy(bars, spec({ stop: { kind: "atr", period: 3, multiple: 2 } }));
    const trade = report.trades[0];
    expect(ranges[4]).toBeGreaterThan(0);
    expect(trade?.stop).toBeCloseTo(100 - (ranges[4] ?? 0) * 2);
    expect(trade?.reason).toBe("stop");
    expect(atr(bars.slice(0, 5), 3)[4]).toBe(ranges[4]);
  });

  it("opens a short only when long and short mode is selected", () => {
    const fall = [bar(20), bar(20), bar(20), bar(20), bar(16), bar(14, { open: 14, high: 14.2, low: 13.8 })];
    expect(backtestStrategy(fall, spec()).trades).toHaveLength(0);
    const both = backtestStrategy(fall, spec({ mode: "both" }));
    expect(both.trades[0]?.direction).toBe("short");
    expect(both.trades[0]?.entry).toBe(14);
    expect(both.trades[0]?.stop).toBeCloseTo(14 * 1.05);
  });

  it("rejects a fast EMA that is not shorter than the slow EMA", () => {
    expect(backtestStrategy(rise, spec({ fast: 3, slow: 3 })).error).toMatch(/kısa/);
  });

  it("rejects a series that cannot fill the next bar", () => {
    expect(backtestStrategy([bar(1), bar(2)], spec()).error).toMatch(/yeterli mum/i);
  });

  it("skips an entry bar with a broken range", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 14, high: 10, low: 16 }),
      bar(16),
    ];
    expect(backtestStrategy(bars, spec()).trades).toHaveLength(0);
  });

  it("reports return, drawdown, win rate and profit factor from the equity curve", () => {
    const bars = [
      bar(10), bar(10), bar(10), bar(10), bar(12),
      bar(14, { open: 100, high: 101, low: 90, close: 100 }),
    ];
    const report = backtestStrategy(bars, spec());
    expect(report.tradeCount).toBe(1);
    expect(report.winRate).toBe(0);
    expect(report.profitFactor).toBe(0);
    expect(report.equity).toHaveLength(bars.length);
    expect(report.endingEquity).toBeCloseTo(10000 + (report.trades[0]?.net ?? 0));
    expect(report.netReturn).toBeCloseTo((report.endingEquity - 10000) / 10000);
    expect(report.maxDrawdown).toBeGreaterThan(0);
  });
});

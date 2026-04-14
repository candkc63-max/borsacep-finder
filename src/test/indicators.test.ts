import { describe, it, expect } from "vitest";
import { calcSMA, calcEMA, calcPrevEMA, calcPrevSMA, applyStrategy, type StrategyId } from "@/lib/indicators";

describe("calcSMA", () => {
  it("returns null when insufficient data", () => {
    expect(calcSMA([1, 2], 5)).toBeNull();
  });

  it("calculates SMA correctly for exact period length", () => {
    expect(calcSMA([5, 4, 3, 2, 1], 5)).toBe(3);
  });

  it("uses only the first `period` elements (newest prices)", () => {
    expect(calcSMA([10, 5, 4, 3, 2, 1], 3)).toBeCloseTo((10 + 5 + 4) / 3);
  });

  it("handles single-element period", () => {
    expect(calcSMA([42, 10, 20], 1)).toBe(42);
  });
});

describe("calcEMA", () => {
  it("returns null when insufficient data", () => {
    expect(calcEMA([1, 2, 3], 5)).toBeNull();
  });

  it("equals SMA when given exactly `period` data points", () => {
    const prices = [5, 4, 3, 2, 1];
    const result = calcEMA(prices, 5);
    expect(result).toBeCloseTo(3, 5);
  });

  it("gives more weight to recent prices", () => {
    // Non-linear uptrend: recent prices accelerate, so EMA > SMA
    const prices = [150, 100, 80, 70, 60, 50, 40, 30, 20, 10];
    const ema = calcEMA(prices, 5)!;
    const sma = calcSMA(prices, 5)!; // (150+100+80+70+60)/5 = 92
    expect(ema).toBeGreaterThan(sma);
  });

  it("produces known value for a hand-calculated example", () => {
    // prices newest first: [30, 28, 26, 24, 22, 20]
    // chronological: [20, 22, 24, 26, 28, 30]
    // SMA(3) seed = (20+22+24)/3 = 22
    // k = 2/(3+1) = 0.5
    // EMA after 26: 26*0.5 + 22*0.5 = 24
    // EMA after 28: 28*0.5 + 24*0.5 = 26
    // EMA after 30: 30*0.5 + 26*0.5 = 28
    const prices = [30, 28, 26, 24, 22, 20];
    expect(calcEMA(prices, 3)).toBeCloseTo(28, 5);
  });
});

describe("calcPrevEMA / calcPrevSMA", () => {
  it("calcPrevEMA shifts prices by 1 day", () => {
    const prices = [30, 28, 26, 24, 22, 20];
    expect(calcPrevEMA(prices, 3)).toBe(calcEMA(prices.slice(1), 3));
  });

  it("calcPrevSMA shifts prices by 1 day", () => {
    const prices = [30, 28, 26, 24, 22, 20];
    expect(calcPrevSMA(prices, 3)).toBe(calcSMA(prices.slice(1), 3));
  });
});

describe("applyStrategy", () => {
  // Helper: create price data padded to a given length
  function makePrices(values: number[], minLength = 250): number[] {
    const result = [...values];
    while (result.length < minLength) result.push(result[result.length - 1]);
    return result;
  }

  const allStrategies: StrategyId[] = ["ema5_22", "ema9_sma20", "fib_5_8_13", "trend_50_200", "pullback"];

  it.each(allStrategies)("strategy '%s' returns a valid StrategyResult", (sid) => {
    const prices = makePrices(Array.from({ length: 250 }, (_, i) => 100 + (250 - i) * 0.1));
    const result = applyStrategy("TEST", "Test Stock", prices, sid);
    expect(result.symbol).toBe("TEST");
    expect(result.name).toBe("Test Stock");
    expect(["AL", "SAT", "NÖTR"]).toContain(result.signal);
    expect(typeof result.price).toBe("number");
    expect(typeof result.change).toBe("number");
    expect(typeof result.details).toBe("string");
    expect(typeof result.indicators).toBe("object");
  });

  it("correctly computes daily % change", () => {
    const prices = makePrices([105, 100, ...Array.from({ length: 248 }, () => 100)]);
    const result = applyStrategy("X", "X", prices, "ema5_22");
    expect(result.change).toBeCloseTo(5.0, 1);
  });

  it("returns NÖTR with insufficient data for trend_50_200", () => {
    const prices = [100, 99];
    const result = applyStrategy("X", "X", prices, "trend_50_200");
    expect(result.signal).toBe("NÖTR");
  });

  it("ema5_22 produces AL in uptrend", () => {
    // Strong consistent uptrend: 5 EMA > 22 EMA
    const prices = makePrices(Array.from({ length: 250 }, (_, i) => 200 - i * 0.5));
    const result = applyStrategy("X", "X", prices, "ema5_22");
    expect(result.signal).toBe("AL");
  });

  it("ema5_22 produces SAT in downtrend", () => {
    // Strong consistent downtrend: 5 EMA < 22 EMA
    const prices = makePrices(Array.from({ length: 250 }, (_, i) => 50 + i * 0.5));
    const result = applyStrategy("X", "X", prices, "ema5_22");
    expect(result.signal).toBe("SAT");
  });

  it("fib_5_8_13 produces SAT when EMAs are bearish-ordered", () => {
    // Steady downtrend
    const prices = makePrices(Array.from({ length: 250 }, (_, i) => 50 + i * 0.5));
    const result = applyStrategy("X", "X", prices, "fib_5_8_13");
    expect(result.signal).toBe("SAT");
  });

  it("trend_50_200 produces AL when SMA50 > SMA200 and price above both", () => {
    // Long uptrend
    const prices = makePrices(Array.from({ length: 250 }, (_, i) => 300 - i * 0.3));
    const result = applyStrategy("X", "X", prices, "trend_50_200");
    expect(result.signal).toBe("AL");
  });
});

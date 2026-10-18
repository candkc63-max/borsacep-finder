import { describe, expect, it } from "vitest";
import { candleOption } from "../../chart/lib/candleChart";
import { choiceById } from "../../chart/lib/chartSearch";
import { fibPrices, intervalsFor, type ChartPrefs } from "../../chart/lib/chartPrefs";
import type { OhlcBar } from "../../chart/lib/parseOhlcv";

const bars: OhlcBar[] = [
  { time: "2024-01-01T10:00", label: "01.01 10:00", open: 10, high: 12, low: 9, close: 11 },
  { time: "2024-01-01T11:00", label: "01.01 11:00", open: 11, high: 13, low: 10, close: 12 },
];

const prefs: ChartPrefs = {
  chartType: "mum",
  ema5: true,
  ema8: false,
  ema13: false,
  rsi: true,
  grid: true,
  lastPrice: true,
  drawings: [
    { id: "h", kind: "hline", price: 11 },
    { id: "f", kind: "fib", a: { index: 0, price: 12 }, b: { index: 1, price: 10 } },
    { id: "m", kind: "measure", a: { index: 0, price: 11 }, b: { index: 1, price: 12 } },
  ],
};

describe("terminal chart prefs", () => {
  it("places fibonacci 0 at the end price and 1 at the start price", () => {
    const levels = fibPrices(110, 100);
    expect(levels[0]?.price).toBe(100);
    expect(levels[levels.length - 1]?.price).toBe(110);
    expect(levels.find((level) => level.ratio === 0.5)?.price).toBeCloseTo(105);
  });

  it("maps BIST 100 intervals onto the stored series", () => {
    const daily = choiceById("xu100-1d");
    expect(daily).toBeTruthy();
    expect(intervalsFor(daily!).map((item) => item.label)).toEqual(["1s", "4s", "1G", "1H"]);
    expect(intervalsFor(daily!).find((item) => item.active)?.id).toBe("xu100-1d");
  });

  it("draws selected indicators and user lines on the price series", () => {
    const option = candleOption(bars, 50, null, prefs) as { series: Array<{ name?: string; type?: string; markLine?: { data: unknown[] } }> };
    expect(option.series.some((series) => series.name === "EMA 5")).toBe(true);
    expect(option.series.some((series) => series.name === "RSI")).toBe(true);
    expect(option.series.some((series) => series.name === "EMA 8")).toBe(false);
    const marks = option.series[0]?.markLine?.data ?? [];
    expect(marks.length).toBeGreaterThan(7);
    const line = candleOption(bars, 50, null, { ...prefs, chartType: "cizgi", drawings: [], rsi: false, ema5: false }) as { series: Array<{ type?: string }> };
    expect(line.series[0]?.type).toBe("line");
  });

  it("shows only the available interval for Nasdaq 100", () => {
    const nasdaq = choiceById("nas100-60");
    expect(intervalsFor(nasdaq!)).toEqual([{ label: "60dk", id: "nas100-60", active: true }]);
  });
});

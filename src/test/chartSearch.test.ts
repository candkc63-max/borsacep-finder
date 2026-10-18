import { describe, expect, it } from "vitest";
import { searchCharts } from "../../chart/lib/chartSearch";
import { barsFromYahoo, groupFourHours } from "../../chart/lib/yahooBars";

describe("chart search", () => {
  it("lists the daily index and nasdaq before a query", () => {
    const titles = searchCharts("").map((item) => `${item.title} ${item.detail}`);
    expect(titles.some((item) => item.includes("BIST 100") && item.includes("günlük"))).toBe(true);
    expect(titles.some((item) => item.startsWith("Nasdaq 100"))).toBe(true);
    expect(titles.some((item) => item.startsWith("Nasdaq günlük"))).toBe(true);
  });

  it("finds a stock and the daily index from text", () => {
    expect(searchCharts("thyao").some((item) => item.id === "stock-THYAO")).toBe(true);
    expect(searchCharts("endeks günlük").some((item) => item.id === "xu100-1d")).toBe(true);
    expect(searchCharts("nasdaq").some((item) => item.id === "nas100-60")).toBe(true);
  });

  it("reads yahoo candles and groups four hours without future bars", () => {
    const bars = barsFromYahoo({
      chart: {
        result: [{
          timestamp: [1_700_000_000, 1_700_003_600, 1_700_007_200],
          indicators: {
            quote: [{
              open: [10, 11, null],
              high: [12, 13, 14],
              low: [9, 10, 8],
              close: [11, 12, 13],
              volume: [1, 2, 3],
            }],
          },
        }],
      },
    });
    expect(bars).toHaveLength(2);
    expect(bars[1].close).toBe(12);
    const grouped = groupFourHours([
      { time: "2026-10-01T09:00:00+03:00", label: "01.10 09:00", open: 10, high: 12, low: 9, close: 11, volume: 1 },
      { time: "2026-10-01T10:00:00+03:00", label: "01.10 10:00", open: 11, high: 15, low: 8, close: 14, volume: 2 },
      { time: "2026-10-01T13:00:00+03:00", label: "01.10 13:00", open: 14, high: 16, low: 13, close: 15, volume: 4 },
    ]);
    expect(grouped.map((bar) => [bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume])).toEqual([
      ["2026-10-01T08:00:00+03:00", 10, 15, 8, 14, 3],
      ["2026-10-01T12:00:00+03:00", 14, 16, 13, 15, 4],
    ]);
  });
});

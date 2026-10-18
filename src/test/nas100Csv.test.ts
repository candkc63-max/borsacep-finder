import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { windowPercent } from "../../chart/lib/candleChart";
import { parseOhlcvCsv } from "../../chart/lib/parseOhlcv";

describe("NAS100 hourly CSV", () => {
  it("reads open high low close and skips the indicator columns", () => {
    const text = readFileSync("public/CAPITALCOM_NAS100_60.csv", "utf8");
    const rows = parseOhlcvCsv(text);
    expect(rows.length).toBeGreaterThan(1600);
    expect(rows[0]).toMatchObject({ time: "2026-07-08T06:00:00+03:00", open: 29229.7, close: 29236.8, volume: null });
    expect(rows.at(-1)?.close).toBe(29193.7);
    expect(windowPercent(rows.length, 120).end).toBe(100);
    expect(windowPercent(rows.length, 120).start).toBeGreaterThan(80);
    expect(windowPercent(10, 100)).toEqual({ start: 0, end: 100 });
    for (const row of rows) {
      expect(row.high).toBeGreaterThanOrEqual(Math.max(row.open, row.close));
      expect(row.low).toBeLessThanOrEqual(Math.min(row.open, row.close));
    }
  });
});

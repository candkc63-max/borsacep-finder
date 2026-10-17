import { describe, expect, it } from "vitest";
import { dummyOhlcv } from "../../chart/lib/dummyOhlcv";

describe("dummyOhlcv", () => {
  it("builds a stable series with valid high and low", () => {
    const rows = dummyOhlcv(40);
    expect(rows).toHaveLength(40);
    expect(rows).toEqual(dummyOhlcv(40));
    for (const row of rows) {
      expect(row.high).toBeGreaterThanOrEqual(Math.max(row.open, row.close));
      expect(row.low).toBeLessThanOrEqual(Math.min(row.open, row.close));
      expect(row.volume).toBeGreaterThan(0);
    }
  });
});

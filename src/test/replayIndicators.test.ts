import { describe, expect, it } from "vitest";
import { ema, replayDelay, replayFocus, replaySlice, rsi, stepCursor } from "../../chart/lib/indicators";

describe("bar replay", () => {
  const closes = Array.from({ length: 40 }, (_, index) => 100 + Math.sin(index / 3) * 5 + index * 0.2);

  it("hides every bar after the playhead", () => {
    const rows = closes.map((close) => ({ close }));
    const visible = replaySlice(rows, 10);
    expect(visible).toHaveLength(11);
    expect(visible.at(-1)?.close).toBe(rows[10].close);
    expect(visible.some((row) => row.close === rows[11].close)).toBe(false);
  });

  it("calculates EMA and RSI only from the bars available at the playhead", () => {
    const fullEma = ema(closes, 5);
    const fullRsi = rsi(closes, 14);
    const cut = 22;
    expect(ema(closes.slice(0, cut + 1), 5)[cut]).toBeCloseTo(fullEma[cut] as number);
    expect(rsi(closes.slice(0, cut + 1), 14)[cut]).toBeCloseTo(fullRsi[cut] as number);
    expect(ema(closes.slice(0, cut + 1), 5)).toHaveLength(cut + 1);
  });

  it("steps inside the series and leaves room on the right", () => {
    expect(stepCursor(4, 1, 10)).toBe(5);
    expect(stepCursor(0, -1, 10)).toBe(0);
    expect(stepCursor(10, 1, 10)).toBe(10);
    const focus = replayFocus(80, 100);
    expect(focus.endValue - focus.startValue).toBe(100);
    expect(focus.axisMax - 80).toBeGreaterThanOrEqual(18);
    expect(replayDelay(2)).toBe(500);
    expect(replayDelay(10)).toBe(100);
  });
});

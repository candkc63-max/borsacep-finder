import { describe, expect, it } from "vitest";
import { mapYahooChart, yahooSymbol } from "@/data/bars";
import { closePosition, openPosition, realizedPnl, scrubTrades, unrealizedPnl } from "@/replay/book";

describe("yahoo bars", () => {
  it("maps BIST symbols and skips empty candles", () => {
    expect(yahooSymbol("thyao", true)).toBe("THYAO.IS");
    expect(yahooSymbol("AAPL", false)).toBe("AAPL");
    expect(yahooSymbol("GC=F", true)).toBe("GC=F");
    const bars = mapYahooChart({
      chart: {
        result: [{
          timestamp: [1, 2, 3],
          indicators: { quote: [{ open: [10, null, 12], high: [11, 12, 13], low: [9, 10, 11], close: [10.5, 11, 12.5], volume: [1, 2, 3] }] },
        }],
      },
    });
    expect(bars).toHaveLength(2);
    expect(bars[1].close).toBe(12.5);
  });
});

describe("bar replay book", () => {
  it("fills at the close and reopens when the cursor moves back", () => {
    let trades = openPosition([], "long", 10, 100, 2);
    trades = closePosition(trades, 12, 110);
    expect(realizedPnl(trades)).toBe(20);
    trades = scrubTrades(trades, 11);
    expect(trades[0].exitIndex).toBeNull();
    expect(unrealizedPnl(trades, 104)).toBe(8);
    expect(scrubTrades(trades, 9)).toEqual([]);
    const again = openPosition(openPosition([], "short", 4, 50, 1), "long", 5, 40, 1);
    expect(again).toHaveLength(1);
    expect(again[0].side).toBe("short");
  });
});

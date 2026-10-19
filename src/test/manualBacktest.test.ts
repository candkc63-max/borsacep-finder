import { describe, expect, it } from "vitest";
import { simulateManual, tradeNet, validateManualOrder, type ManualOrder, type PriceBar } from "../../chart/lib/manualBacktest";

function order(partial: Partial<ManualOrder> & Pick<ManualOrder, "direction" | "entry" | "stop" | "target">): ManualOrder {
  return {
    id: partial.id ?? "t1",
    entryCursor: partial.entryCursor ?? 0,
    size: partial.size ?? 1,
    manualExit: partial.manualExit ?? null,
    direction: partial.direction,
    entry: partial.entry,
    stop: partial.stop,
    target: partial.target,
  };
}

const flat = (close: number): PriceBar => ({ open: close, high: close, low: close, close });

describe("manual backtest", () => {
  const rate = 0.001;
  const capital = 10000;

  it("closes a long at the target and deducts both commissions", () => {
    const bars: PriceBar[] = [flat(100), { open: 101, high: 105, low: 99, close: 104 }, { open: 106, high: 112, low: 105, close: 111 }];
    const placed = order({ direction: "long", entry: 100, stop: 90, target: 110 });
    const before = simulateManual([placed], bars, 1, rate, capital);
    expect(before.closed).toHaveLength(0);
    expect(before.open).toHaveLength(1);
    expect(before.unrealized).toBeCloseTo(4 - 0.1);
    expect(before.equity).toBeCloseTo(capital + 3.9);

    const after = simulateManual([placed], bars, 2, rate, capital);
    expect(after.closed[0].reason).toBe("target");
    expect(after.closed[0].exit).toBe(110);
    expect(after.closed[0].net).toBeCloseTo(tradeNet("long", 100, 110, 1, rate));
    expect(after.closed[0].net).toBeCloseTo(9.79);
    expect(after.equity).toBeCloseTo(capital + 9.79);
    expect(after.wins).toBe(1);
    expect(after.winRate).toBe(1);
  });

  it("closes a short at the stop", () => {
    const bars: PriceBar[] = [flat(100), { open: 101, high: 106, low: 99, close: 102 }];
    const placed = order({ direction: "short", entry: 100, stop: 105, target: 90 });
    const book = simulateManual([placed], bars, 1, rate, capital);
    expect(book.closed[0].reason).toBe("stop");
    expect(book.closed[0].exit).toBe(105);
    expect(book.closed[0].net).toBeCloseTo(-5.205);
    expect(book.losses).toBe(1);
  });

  it("uses the stop when the same bar touches both levels", () => {
    const bars: PriceBar[] = [flat(100), { open: 100, high: 115, low: 85, close: 100 }];
    const long = simulateManual([order({ direction: "long", entry: 100, stop: 90, target: 110 })], bars, 1, rate, capital);
    expect(long.closed[0].reason).toBe("stop");
    expect(long.closed[0].exit).toBe(90);
    expect(long.closed[0].net).toBeCloseTo(-10.19);

    const short = simulateManual([order({ id: "s", direction: "short", entry: 100, stop: 110, target: 90 })], bars, 1, rate, capital);
    expect(short.closed[0].reason).toBe("stop");
    expect(short.closed[0].exit).toBe(110);
    expect(short.closed[0].net).toBeCloseTo(-10.21);
  });

  it("fills a gap at the open", () => {
    const bars: PriceBar[] = [flat(100), { open: 80, high: 82, low: 79, close: 81 }];
    const stopped = simulateManual([order({ direction: "long", entry: 100, stop: 90, target: 110 })], bars, 1, rate, capital);
    expect(stopped.closed[0].reason).toBe("gap-stop");
    expect(stopped.closed[0].exit).toBe(80);

    const targeted = simulateManual(
      [order({ direction: "long", entry: 100, stop: 90, target: 110 })],
      [flat(100), { open: 120, high: 122, low: 119, close: 121 }],
      1,
      rate,
      capital,
    );
    expect(targeted.closed[0].reason).toBe("gap-target");
    expect(targeted.closed[0].exit).toBe(120);
    expect(targeted.closed[0].net).toBeCloseTo(19.78);
  });

  it("does not use the entry bar or any bar after the playhead", () => {
    const bars: PriceBar[] = [
      { open: 100, high: 100, low: 80, close: 100 },
      flat(101),
      { open: 102, high: 130, low: 102, close: 130 },
    ];
    const placed = order({ direction: "long", entry: 100, stop: 90, target: 110 });
    const atEntry = simulateManual([placed], bars, 0, rate, capital);
    expect(atEntry.open).toHaveLength(1);
    expect(atEntry.closed).toHaveLength(0);
    const beforeFuture = simulateManual([placed], bars, 1, rate, capital);
    expect(beforeFuture.closed).toHaveLength(0);
    expect(beforeFuture.marks[0].stop).toBe(90);
    expect(beforeFuture.marks[0].exitPrice).toBeNull();
  });

  it("hides trades placed in the future and restores them when the cursor returns", () => {
    const bars = [flat(100), flat(101), flat(102), { open: 103, high: 112, low: 103, close: 111 }];
    const placed = order({ entryCursor: 2, direction: "long", entry: 102, stop: 90, target: 110 });
    const rewound = simulateManual([placed], bars, 1, rate, capital);
    expect(rewound.open).toHaveLength(0);
    expect(rewound.closed).toHaveLength(0);
    expect(rewound.equity).toBe(capital);
    expect(rewound.maxDrawdown).toBe(0);

    const forward = simulateManual([placed], bars, 3, rate, capital);
    expect(forward.closed).toHaveLength(1);
    expect(forward.closed[0].exit).toBe(110);
    const mid = simulateManual([placed], bars, 2, rate, capital);
    expect(mid.open).toHaveLength(1);
    expect(mid.closed).toHaveLength(0);
    expect(mid.unrealized).toBeCloseTo(-102 * rate);
  });

  it("closes manually at the playhead and keeps profit factor and drawdown consistent", () => {
    const bars = [flat(100), flat(90), flat(110)];
    const placed = order({
      direction: "long",
      entry: 100,
      stop: 70,
      target: 140,
      manualExit: { cursor: 1, price: 90 },
    });
    const book = simulateManual([placed], bars, 2, 0, 1000);
    expect(book.closed[0].reason).toBe("manual");
    expect(book.closed[0].exit).toBe(90);
    expect(book.closed[0].net).toBe(-10);
    expect(book.equity).toBe(990);
    expect(book.maxDrawdown).toBe(10);
    expect(book.profitFactor).toBe(0);

    const mixed = simulateManual(
      [
        order({ id: "win", direction: "long", entry: 100, stop: 90, target: 110, manualExit: { cursor: 1, price: 110 } }),
        order({ id: "loss", direction: "long", entry: 100, stop: 90, target: 130, manualExit: { cursor: 1, price: 95 } }),
      ],
      [flat(100), flat(100)],
      1,
      0,
      1000,
    );
    expect(mixed.wins).toBe(1);
    expect(mixed.losses).toBe(1);
    expect(mixed.winRate).toBe(0.5);
    expect(mixed.profitFactor).toBeCloseTo(10 / 5);
    expect(mixed.realized).toBe(5);
  });

  it("keeps capital, commission and size consistent for long and short", () => {
    const longBars: PriceBar[] = [flat(100), { open: 100, high: 110, low: 95, close: 108 }];
    const long = simulateManual([order({ direction: "long", entry: 100, stop: 90, target: 110, size: 2 })], longBars, 1, rate, capital);
    expect(long.closed[0].reason).toBe("target");
    expect(long.closed[0].net).toBeCloseTo(tradeNet("long", 100, 110, 2, rate));
    expect(long.equity).toBeCloseTo(capital + (long.closed[0].net ?? 0));
    expect(long.realized).toBeCloseTo(long.closed[0].net ?? 0);
    expect(long.unrealized).toBe(0);

    const shortBars: PriceBar[] = [flat(100), { open: 100, high: 110, low: 95, close: 108 }];
    const short = simulateManual([order({ id: "s", direction: "short", entry: 100, stop: 110, target: 90, size: 3 })], shortBars, 1, rate, capital);
    expect(short.closed[0].reason).toBe("stop");
    expect(short.closed[0].net).toBeCloseTo(tradeNet("short", 100, 110, 3, rate));
    expect(short.equity).toBeCloseTo(capital + (short.closed[0].net ?? 0));
    expect(short.realized).toBeCloseTo(short.equity - capital);
  });

  it("rejects an entry outside the current candle", () => {
    const bar = { open: 100, high: 105, low: 99, close: 104 };
    expect(validateManualOrder({ direction: "long", entry: 110, size: 1, stop: 90, target: 120 }, bar)).toMatch(/en düşük/);
    expect(validateManualOrder({ direction: "short", entry: 104, size: 1, stop: 100, target: 90 }, bar)).toMatch(/Stop Loss/);
    expect(validateManualOrder({ direction: "long", entry: 104, size: 1, stop: 106, target: 110 }, bar)).toMatch(/Stop Loss/);
    expect(validateManualOrder({ direction: "long", entry: 104, size: 1, stop: 90, target: 100 }, bar)).toMatch(/Take Profit/);
    expect(validateManualOrder({ direction: "short", entry: 104, size: 1, stop: 110, target: 106 }, bar)).toMatch(/Take Profit/);
    expect(validateManualOrder({ direction: "long", entry: Number.NaN, size: 1, stop: 90, target: 120 }, bar)).toMatch(/Giriş/);
    expect(validateManualOrder({ direction: "long", entry: 104, size: 1, stop: Number.NaN, target: 120 }, bar)).toMatch(/Stop Loss sayı/);
    expect(validateManualOrder({ direction: "long", entry: 104, size: 1, stop: 90, target: 110 }, bar)).toBeNull();
  });
});

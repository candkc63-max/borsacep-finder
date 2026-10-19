import { describe, expect, it } from "vitest";
import { ema } from "../../chart/lib/indicators";
import {
  bollinger,
  cci,
  donchian,
  hma,
  keltner,
  macd,
  obv,
  roc,
  sma,
  stochastic,
  supertrend,
  vwap,
  wma,
} from "../../chart/lib/moreIndicators";

const bars = [
  { high: 10, low: 8, close: 9, volume: 100 },
  { high: 11, low: 9, close: 10, volume: 50 },
  { high: 12, low: 10, close: 11, volume: null },
  { high: 11, low: 8, close: 9, volume: 20 },
  { high: 13, low: 11, close: 12, volume: 10 },
  { high: 8, low: 4, close: 5, volume: 40 },
];

describe("yeni göstergeler", () => {
  it("SMA ve WMA pencerelerini bağımsız toplar", () => {
    const values = [1, 2, 3, 4];
    expect(sma(values, 3)).toEqual([null, null, 2, 3]);
    expect(wma(values, 3)[2]).toBeCloseTo((1 + 4 + 9) / 6);
    expect(wma(values, 3)[3]).toBeCloseTo((2 + 6 + 12) / 6);
  });

  it("HMA yarım periyodu tabana, kökü en yakına yuvarlar", () => {
    const values = [1, 2, 3, 4, 5, 6];
    const half = wma(values, 2);
    const full = wma(values, 4);
    const raw = values.map((_, index) => (half[index] == null || full[index] == null ? null : 2 * half[index]! - full[index]!));
    const root = 2;
    const denom = 3;
    const expected = raw.map((_, index) => {
      if (index < 1 || raw[index] == null || raw[index - 1] == null) return null;
      return (raw[index - 1]! + 2 * raw[index]!) / denom;
    });
    expect(hma(values, 4).map((value) => (value == null ? null : Number(value.toFixed(8))))).toEqual(
      expected.map((value) => (value == null ? null : Number(value.toFixed(8)))),
    );
  });

  it("MACD sinyalini SMA tohumlu EMA ile kurar", () => {
    const closes = [10, 11, 12, 13, 14, 15, 14, 13];
    const result = macd(closes, 3, 5, 3);
    const fast = ema(closes, 3);
    const slow = ema(closes, 5);
    const line = closes.map((_, index) => (fast[index] == null || slow[index] == null ? null : fast[index]! - slow[index]!));
    expect(result.macd).toEqual(line);
    const ready = line.filter((value): value is number => value != null);
    const seed = (ready[0] + ready[1] + ready[2]) / 3;
    const next = ready[3] * (2 / 4) + seed * (1 - 2 / 4);
    const signalValues = result.signal.filter((value) => value != null);
    expect(signalValues[0]).toBeCloseTo(seed);
    expect(signalValues[1]).toBeCloseTo(next);
    expect(result.histogram[4]).toBeNull();
  });

  it("Stochastic, Bollinger ve Keltner ısınmayı bekler", () => {
    const stoch = stochastic(bars, 3, 2);
    const low = Math.min(10, 9, 8);
    const high = Math.max(12, 11, 10);
    expect(stoch.k[1]).toBeNull();
    expect(stoch.k[2]).toBeCloseTo((100 * (11 - low)) / (high - low));
    expect(stoch.d[2]).toBeNull();
    expect(stoch.d[3]).toBeCloseTo(((stoch.k[2] ?? 0) + (stoch.k[3] ?? 0)) / 2);
    const flat = stochastic([{ high: 5, low: 5, close: 5 }, { high: 5, low: 5, close: 5 }], 2, 1);
    expect(flat.k[1]).toBe(0);

    const closes = bars.map((bar) => bar.close);
    const bands = bollinger(closes, 3, 2);
    const mean = (9 + 10 + 11) / 3;
    const deviation = Math.sqrt(([9, 10, 11].reduce((sum, value) => sum + (value - mean) ** 2, 0)) / 3);
    expect(bands.middle[2]).toBeCloseTo(mean);
    expect(bands.upper[2]).toBeCloseTo(mean + 2 * deviation);
    expect(bands.lower[1]).toBeNull();

    const channel = keltner(bars, 3, 2, 1);
    expect(channel.middle[2]).toBeCloseTo(ema(closes, 3)[2]!);
    expect(channel.upper[0]).toBeNull();
    expect(channel.upper[2]).not.toBeNull();
  });

  it("Donchian mevcut mumu banda katar, Supertrend yön değiştirir", () => {
    const channel = donchian(bars, 3);
    expect(channel.upper[2]).toBe(12);
    expect(channel.lower[2]).toBe(8);
    expect(channel.middle[2]).toBe(10);
    const trend = supertrend(bars, 2, 2);
    expect(trend.line[0]).toBeNull();
    expect(trend.direction[1]).toBe("up");
    expect(trend.line[1]).toBeCloseTo(6);
    expect(trend.line[4]).toBeCloseTo(7);
    expect(trend.direction[5]).toBe("down");
    expect(trend.line[5]).toBeCloseTo(14);
  });

  it("CCI, ROC, OBV ve VWAP gelecek bara bakmaz", () => {
    const typical = bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
    const mean = (typical[0] + typical[1] + typical[2]) / 3;
    const deviation = [0, 1, 2].reduce((sum, index) => sum + Math.abs(typical[index] - mean), 0) / 3;
    expect(cci(bars, 3)[2]).toBeCloseTo((typical[2] - mean) / (0.015 * deviation));
    expect(cci(bars, 3)[1]).toBeNull();
    expect(roc(bars.map((bar) => bar.close), 2)[2]).toBeCloseTo((100 * (11 - 9)) / 9);
    expect(roc([0, 0, 1], 2)[2]).toBeNull();
    expect(obv(bars)).toEqual([0, 50, 50, 30, 40, 0]);
    const vwapFull = vwap(bars);
    const head = vwap(bars.slice(0, 3));
    expect(head[2]).toBe(vwapFull[2]);
    expect(vwap([{ high: 1, low: 1, close: 1, volume: null }])[0]).toBeNull();
    expect(cci(bars, 3)[2]).toBe(cci(bars.slice(0, 3), 3)[2]);
    expect(donchian(bars, 3).upper[2]).toBe(donchian(bars.slice(0, 3), 3).upper[2]);
  });
});

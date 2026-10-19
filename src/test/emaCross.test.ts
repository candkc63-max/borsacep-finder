import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backtestEmaCross, priceSeriesNote, projectStrategy, type EmaCrossSpec } from "../../chart/lib/emaCross";
import { parseOhlcvCsv, type OhlcBar } from "../../chart/lib/parseOhlcv";

function bar(index: number, open: number, close: number): OhlcBar {
  const hour = String(index).padStart(2, "0");
  const high = Math.max(open, close);
  const low = Math.min(open, close);
  return { time: `2026-01-01T${hour}:00:00+03:00`, label: hour, open, high, low, close, volume: null };
}

function series(opens: number[], closes: number[]) {
  return opens.map((open, index) => bar(index, open, closes[index]));
}

const spec: EmaCrossSpec = { fast: 2, slow: 3, capital: 1000, allocation: 1, feeRate: 0, slippageRate: 0 };

function oracleEma(values: number[], period: number) {
  const out: Array<number | null> = [];
  const weight = 2 / (period + 1);
  let previous: number | null = null;
  for (let index = 0; index < values.length; index += 1) {
    if (index < period - 1) {
      out.push(null);
      continue;
    }
    if (previous == null) {
      let sum = 0;
      for (let offset = 0; offset < period; offset += 1) sum += values[index - period + 1 + offset];
      previous = sum / period;
    } else {
      previous = values[index] * weight + previous * (1 - weight);
    }
    out.push(previous);
  }
  return out;
}

describe("EMA 20/50 long backtest", () => {
  const opens = [10, 10, 10, 11, 20, 8, 7];
  const closes = [10, 10, 10, 11, 13, 8, 6];
  const bars = series(opens, closes);

  it("crosses on the computed bar and fills the next open", () => {
    const fast = oracleEma(closes, 2);
    const slow = oracleEma(closes, 3);
    expect(fast[1]).toBe(10);
    expect(slow[2]).toBe(10);
    expect(fast[3]).toBeCloseTo(10.6666666667);
    expect(slow[3]).toBe(10.5);
    expect(fast[2]! <= slow[2]! && fast[3]! > slow[3]!).toBe(true);
    const report = backtestEmaCross(bars, spec, priceSeriesNote("csv"));
    expect(report.ok).toBe(true);
    expect(report.trades).toHaveLength(1);
    const trade = report.trades[0];
    expect(trade.signalIndex).toBe(3);
    expect(trade.entryIndex).toBe(4);
    expect(trade.entryPrice).toBe(20);
    expect(trade.exitSignalIndex).toBe(5);
    expect(trade.exitIndex).toBe(6);
    expect(trade.exitPrice).toBe(7);
    expect(trade.shares).toBe(50);
    expect(trade.realized).toBe(-650);
    expect(report.portfolio).toBe(350);
    expect(report.realized).toBe(-650);
    expect(report.unrealized).toBe(0);
    expect(report.maxDrawdown).toBe(650);
    expect(report.maxDrawdownPercent).toBeCloseTo(0.65);
    expect(report.buyHold).toMatchObject({ shares: 100, portfolio: 600, totalReturn: -0.4 });
    expect(report.pending).toBeNull();
  });

  it("charges commission on the buy and the sell without taking cash negative", () => {
    const report = backtestEmaCross(bars, { ...spec, feeRate: 0.0005 }, priceSeriesNote("csv"));
    const trade = report.trades[0];
    expect(trade.shares).toBe(49);
    expect(trade.entryCommission).toBeCloseTo(0.49);
    expect(trade.exitCommission).toBeCloseTo(0.1715);
    expect(trade.realized).toBeCloseTo(-637.6615);
    expect(report.totalCommission).toBeCloseTo(0.6615);
    expect(report.portfolio).toBeCloseTo(362.3385);
    expect(report.portfolio).toBeGreaterThanOrEqual(-1e-8);
    const unit = 20 * 1.0005;
    expect(49 * unit).toBeLessThanOrEqual(1000);
    expect(50 * unit).toBeGreaterThan(1000);
  });

  it("applies adverse slippage to the next open", () => {
    const report = backtestEmaCross(bars, { ...spec, slippageRate: 0.01 }, priceSeriesNote("csv"));
    const trade = report.trades[0];
    expect(trade.entryPrice).toBeCloseTo(20.2);
    expect(trade.exitPrice).toBeCloseTo(6.93);
    expect(trade.shares).toBe(49);
    expect(trade.realized).toBeCloseTo(-650.23);
  });

  it("keeps an unrealized open position when the exit signal is on the last bar", () => {
    const cut = bars.slice(0, 6);
    const report = backtestEmaCross(cut, spec, priceSeriesNote("csv"));
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0].exitIndex).toBeNull();
    expect(report.pending).toEqual({ side: "sell", signalIndex: 5 });
    expect(report.realized).toBe(0);
    expect(report.unrealized).toBe(-600);
    expect(report.portfolio).toBe(400);
    expect(report.completed).toBe(0);
    expect(report.openShares).toBe(50);
  });

  it("does not execute a buy signal that appears on the final bar", () => {
    const onlySignal = bars.slice(0, 4);
    const report = backtestEmaCross(onlySignal, spec, priceSeriesNote("csv"));
    expect(report.trades).toEqual([]);
    expect(report.pending).toEqual({ side: "buy", signalIndex: 3 });
    expect(report.portfolio).toBe(1000);
    expect(report.realized).toBe(0);
    expect(report.unrealized).toBe(0);
  });

  it("hides future fills while replaying", () => {
    const full = backtestEmaCross(bars, spec, priceSeriesNote("csv"));
    const atSignal = projectStrategy(full, bars, 3);
    expect(atSignal.trades).toEqual([]);
    expect(atSignal.pending).toEqual({ side: "buy", signalIndex: 3 });
    expect(atSignal.portfolio).toBe(1000);
    const atEntry = projectStrategy(full, bars, 4);
    expect(atEntry.trades[0].exitPrice).toBeNull();
    expect(atEntry.realized).toBe(0);
    expect(atEntry.portfolio).toBe(650);
    expect(atEntry.unrealized).toBe(-350);
    expect(atEntry.completed).toBe(0);
    expect(atEntry.profitFactor).toBeNull();
    const extended = backtestEmaCross([...bars, bar(7, 6, 9)], spec, priceSeriesNote("csv"));
    expect(extended.trades[0]).toMatchObject({ entryIndex: 4, entryPrice: 20, exitIndex: 6, exitPrice: 7, realized: -650 });
  });

  it("skips a share it cannot afford and rejects a broken bar", () => {
    const poor = backtestEmaCross(bars, { ...spec, capital: 10 }, priceSeriesNote("csv"));
    expect(poor.trades).toEqual([]);
    expect(poor.portfolio).toBe(10);
    const broken = bars.map((item) => ({ ...item }));
    broken[2] = { ...broken[2], open: 10, close: 12, high: 11, low: 9 };
    const rejected = backtestEmaCross(broken, spec, priceSeriesNote("csv"));
    expect(rejected.ok).toBe(false);
    expect(rejected.trades).toEqual([]);
    expect(rejected.error).toMatch(/uyuşmuyor/);
    expect(backtestEmaCross(bars, { ...spec, fast: 5, slow: 5 }, priceSeriesNote("csv")).ok).toBe(false);
  });
});

describe("NAS100 EMA 20/50", () => {
  const rows = parseOhlcvCsv(readFileSync("public/CAPITALCOM_NAS100_60.csv", "utf8"));
  const report = backtestEmaCross(rows, {
    fast: 20,
    slow: 50,
    capital: 100_000,
    allocation: 1,
    feeRate: 0.0005,
    slippageRate: 0,
  }, priceSeriesNote("csv"));

  it("runs on the file without borrowing or leaking the last bar", () => {
    expect(report.ok).toBe(true);
    expect(report.adjustment).toMatch(/Düzeltilmemiş/);
    expect(report.bars).toBe(rows.length);
    expect(report.from).toBe(rows[0].time);
    expect(report.to).toBe(rows.at(-1)?.time);
    expect(report.trades.every((trade) => Number.isInteger(trade.shares) && trade.shares >= 1)).toBe(true);
    expect(report.trades.every((trade) => trade.entryIndex === trade.signalIndex + 1)).toBe(true);
    expect(report.trades.every((trade) => trade.exitIndex == null || trade.exitIndex === (trade.exitSignalIndex ?? -1) + 1)).toBe(true);
    expect(report.trades.some((trade) => trade.entryIndex >= rows.length)).toBe(false);
    let cash = 100_000;
    for (const trade of report.trades) {
      const cost = trade.shares * trade.entryPrice + trade.entryCommission;
      expect(cost).toBeLessThanOrEqual(cash + 1e-6);
      cash -= cost;
      expect(cash).toBeGreaterThanOrEqual(-1e-6);
      if (trade.exitPrice != null && trade.exitCommission != null) {
        cash += trade.shares * trade.exitPrice - trade.exitCommission;
      }
    }
    const open = report.trades.find((trade) => trade.exitIndex == null);
    if (open) {
      expect(report.completed).toBe(report.trades.length - 1);
      expect(report.unrealized).not.toBe(0);
    } else {
      expect(report.unrealized).toBe(0);
      expect(report.portfolio).toBeCloseTo(100_000 + report.realized, 4);
    }
    const replay = projectStrategy(report, rows, 80);
    expect(replay.trades.every((trade) => trade.entryIndex <= 80)).toBe(true);
    expect(replay.trades.every((trade) => trade.exitIndex == null || trade.exitIndex <= 80)).toBe(true);
    expect(replay.equity).toHaveLength(81);
    expect(replay.bars).toBe(81);
    expect(report.completed + (report.openShares > 0 ? 1 : 0)).toBe(report.trades.length);
    expect(report.completed).toBe(12);
    expect(report.wins).toBe(6);
    expect(report.losses).toBe(6);
    expect(report.openShares).toBe(0);
    expect(report.realized).toBeCloseTo(4586.6994, 4);
    expect(report.totalReturn).toBeCloseTo(0.045866994, 6);
    expect(report.maxDrawdown).toBeCloseTo(4611.2268, 4);
    expect(report.maxDrawdownPercent).toBeCloseTo(0.043868649, 6);
    expect(report.totalCommission).toBeCloseTo(1062.3006, 4);
    expect(report.buyHold?.totalReturn).toBeCloseTo(-0.0015184455, 6);
  });
});

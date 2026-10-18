import { ema } from "./indicators";
import { barExit, openNet, tradeNet, type ExitReason, type PriceBar, type Side, type TradeMark } from "./manualBacktest";

export type StopSpec =
  | { kind: "fixed"; percent: number }
  | { kind: "atr"; period: number; multiple: number };

export type StrategySpec = {
  fast: number;
  slow: number;
  mode: "long" | "both";
  stop: StopSpec;
  size: number;
  capital: number;
  feeRate: number;
  slippageRate: number;
};

export type StrategyTrade = {
  id: string;
  direction: Side;
  signalIndex: number;
  entryIndex: number;
  exitIndex: number | null;
  entry: number;
  exit: number | null;
  stop: number;
  size: number;
  reason: ExitReason | null;
  net: number | null;
};

export type StrategyReport = {
  error: string | null;
  trades: StrategyTrade[];
  equity: number[];
  netReturn: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number | null;
  winRate: number | null;
  profitFactor: number | null;
  tradeCount: number;
  realized: number;
  endingEquity: number;
};

const NO_TARGET = {
  long: Number.POSITIVE_INFINITY,
  short: Number.NEGATIVE_INFINITY,
};

export function atr(bars: PriceBar[], period: number): Array<number | null> {
  const out: Array<number | null> = bars.map(() => null);
  if (!Number.isInteger(period) || period < 1) return out;
  const range: number[] = [];
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (!bar || !Number.isFinite(bar.high) || !Number.isFinite(bar.low) || bar.high < bar.low) {
      range.push(Number.NaN);
      continue;
    }
    const previous = index === 0 ? null : bars[index - 1]?.close;
    const span = previous == null || !Number.isFinite(previous)
      ? bar.high - bar.low
      : Math.max(bar.high - bar.low, Math.abs(bar.high - previous), Math.abs(bar.low - previous));
    range.push(span);
  }
  if (range.length < period || range.slice(0, period).some((value) => !Number.isFinite(value))) return out;
  let value = range.slice(0, period).reduce((sum, item) => sum + item, 0) / period;
  out[period - 1] = value;
  for (let index = period; index < range.length; index += 1) {
    if (!Number.isFinite(range[index]) || !Number.isFinite(value)) {
      value = Number.NaN;
      continue;
    }
    value = (value * (period - 1) + range[index]) / period;
    out[index] = value;
  }
  return out;
}

export function validateStrategy(spec: StrategySpec, barCount: number): string | null {
  if (!Number.isInteger(spec.fast) || !Number.isInteger(spec.slow) || spec.fast < 1 || spec.slow < 2) {
    return "EMA periyotları pozitif tam sayı olmalı.";
  }
  if (spec.fast >= spec.slow) return "Hızlı EMA, yavaş EMA'dan kısa olmalı.";
  if (!Number.isFinite(spec.size) || spec.size <= 0) return "İşlem büyüklüğü sıfırdan büyük olmalı.";
  if (!Number.isFinite(spec.capital) || spec.capital <= 0) return "Başlangıç sermayesi sıfırdan büyük olmalı.";
  if (!Number.isFinite(spec.feeRate) || spec.feeRate < 0) return "Komisyon negatif olamaz.";
  if (!Number.isFinite(spec.slippageRate) || spec.slippageRate < 0 || spec.slippageRate >= 1) return "Kayma 0 ile 1 arasında olmalı.";
  if (spec.stop.kind === "fixed") {
    if (!Number.isFinite(spec.stop.percent) || spec.stop.percent <= 0 || spec.stop.percent >= 1) {
      return "Sabit stop yüzdesi 0 ile 100 arasında olmalı.";
    }
  } else if (!Number.isInteger(spec.stop.period) || spec.stop.period < 1 || !Number.isFinite(spec.stop.multiple) || spec.stop.multiple <= 0) {
    return "ATR periyodu ve katsayısı geçersiz.";
  }
  const needed = spec.stop.kind === "atr" ? Math.max(spec.slow, spec.stop.period) + 2 : spec.slow + 2;
  if (barCount < needed) return "Seçilen periyotlar için yeterli mum yok.";
  return null;
}

function usable(bar: PriceBar | undefined): bar is PriceBar {
  return !!bar && [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) && bar.high >= bar.low;
}

function slipEntry(direction: Side, bar: PriceBar, rate: number) {
  const raw = direction === "long" ? bar.open * (1 + rate) : bar.open * (1 - rate);
  return direction === "long" ? Math.min(raw, bar.high) : Math.max(raw, bar.low);
}

function slipExit(direction: Side, theoretical: number, bar: PriceBar, rate: number) {
  const raw = direction === "long" ? theoretical * (1 - rate) : theoretical * (1 + rate);
  return direction === "long" ? Math.max(raw, bar.low) : Math.min(raw, bar.high);
}

function crossed(fast: Array<number | null>, slow: Array<number | null>, index: number, up: boolean) {
  const fastNow = fast[index];
  const slowNow = slow[index];
  const fastPrev = fast[index - 1];
  const slowPrev = slow[index - 1];
  if (![fastNow, slowNow, fastPrev, slowPrev].every((value) => value != null && Number.isFinite(value))) return false;
  if (up) return (fastPrev as number) <= (slowPrev as number) && (fastNow as number) > (slowNow as number);
  return (fastPrev as number) >= (slowPrev as number) && (fastNow as number) < (slowNow as number);
}

function empty(error: string, capital: number): StrategyReport {
  return {
    error,
    trades: [],
    equity: [],
    netReturn: null,
    maxDrawdown: 0,
    maxDrawdownPercent: null,
    winRate: null,
    profitFactor: null,
    tradeCount: 0,
    realized: 0,
    endingEquity: capital,
  };
}

export function backtestStrategy(bars: PriceBar[], spec: StrategySpec): StrategyReport {
  const problem = validateStrategy(spec, bars.length);
  if (problem) return empty(problem, spec.capital);
  const closes = bars.map((bar) => bar.close);
  const fast = ema(closes, spec.fast);
  const slow = ema(closes, spec.slow);
  const ranges = spec.stop.kind === "atr" ? atr(bars, spec.stop.period) : [];
  const trades: StrategyTrade[] = [];
  const equity = bars.map(() => spec.capital);
  let realized = 0;
  let open: StrategyTrade | null = null;
  let sequence = 1;

  const mark = (index: number) => {
    if (!open || index < open.entryIndex || !usable(bars[index])) {
      equity[index] = spec.capital + realized;
      return;
    }
    equity[index] = spec.capital + realized + openNet(open.direction, open.entry, bars[index].close, open.size, spec.feeRate);
  };

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (open && index >= open.entryIndex && usable(bar)) {
      const hit = barExit(open.direction, open.stop, NO_TARGET[open.direction], bar);
      if (hit) {
        const exit = slipExit(open.direction, hit.price, bar, spec.slippageRate);
        const net = tradeNet(open.direction, open.entry, exit, open.size, spec.feeRate);
        open.exitIndex = index;
        open.exit = exit;
        open.reason = hit.reason;
        open.net = net;
        realized += net;
        open = null;
      }
    }
    if (!open && index > 0 && index < bars.length - 1 && usable(bar) && usable(bars[index + 1])) {
      const longSignal = crossed(fast, slow, index, true);
      const shortSignal = spec.mode === "both" && crossed(fast, slow, index, false);
      if (longSignal || shortSignal) {
        const direction: Side = longSignal ? "long" : "short";
        const entry = slipEntry(direction, bars[index + 1], spec.slippageRate);
        const distance = spec.stop.kind === "fixed"
          ? entry * spec.stop.percent
          : (ranges[index] ?? Number.NaN) * spec.stop.multiple;
        const stop = direction === "long" ? entry - distance : entry + distance;
        const placed = direction === "long" ? stop < entry : stop > entry;
        if (Number.isFinite(distance) && distance > 0 && placed) {
          open = {
            id: `strateji-${sequence}`,
            direction,
            signalIndex: index,
            entryIndex: index + 1,
            exitIndex: null,
            entry,
            exit: null,
            stop,
            size: spec.size,
            reason: null,
            net: null,
          };
          sequence += 1;
          trades.push(open);
        }
      }
    }
    mark(index);
  }

  const closed = trades.filter((trade) => trade.net != null);
  const wins = closed.filter((trade) => (trade.net ?? 0) > 0);
  const losses = closed.filter((trade) => (trade.net ?? 0) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + (trade.net ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + (trade.net ?? 0), 0));
  let peak = spec.capital;
  let maxDrawdown = 0;
  for (const value of equity) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, peak - value);
  }
  const endingEquity = equity[equity.length - 1] ?? spec.capital;
  return {
    error: null,
    trades,
    equity,
    netReturn: (endingEquity - spec.capital) / spec.capital,
    maxDrawdown,
    maxDrawdownPercent: peak > 0 ? maxDrawdown / peak : null,
    winRate: closed.length ? wins.length / closed.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    tradeCount: trades.length,
    realized,
    endingEquity,
  };
}

export function strategyMarks(trades: StrategyTrade[], cursor: number | null): TradeMark[] {
  return trades.flatMap((trade) => {
    if (cursor != null && trade.entryIndex > cursor) return [];
    const exited = trade.exitIndex != null && trade.exit != null && (cursor == null || trade.exitIndex <= cursor);
    return [{
      entryIndex: trade.entryIndex,
      entryPrice: trade.entry,
      entryBuy: trade.direction === "long",
      exitIndex: exited ? trade.exitIndex : null,
      exitPrice: exited ? trade.exit : null,
      exitBuy: trade.direction === "short",
      stop: exited ? null : trade.stop,
      target: null,
    }];
  });
}

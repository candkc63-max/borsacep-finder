import { adx, atr, ema, rsi } from "../../chart/lib/indicators";
import { bollinger, donchian, macd, sma, stochastic, supertrend } from "../../chart/lib/moreIndicators";

export type ScreenInterval = "1d" | "1wk" | "1h" | "4h";

export type BarPoint = {
  time?: string;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type TechnicalSnapshot = {
  close: number | null;
  ema20: number | null;
  ema50: number | null;
  ema100: number | null;
  ema200: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  adx: number | null;
  atr: number | null;
  stochK: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbPercent: number | null;
  supertrend: number | null;
  supertrendUp: boolean | null;
  donchianUpper: number | null;
  aboveEma20: boolean | null;
  aboveEma200: boolean | null;
  emaBullStack: boolean | null;
  ema20AboveEma50: boolean | null;
  emaCrossUp: boolean | null;
  emaCrossDown: boolean | null;
  priceEma20Above: boolean | null;
  priceEma20CrossUp: boolean | null;
  priceEma20CrossDown: boolean | null;
  priceEma200Above: boolean | null;
  priceEma200CrossUp: boolean | null;
  priceEma200CrossDown: boolean | null;
  macdAbove: boolean | null;
  macdCrossUp: boolean | null;
  macdCrossDown: boolean | null;
  rsiAbove50: boolean | null;
  adxAbove25: boolean | null;
  declineAboveSupport: boolean | null;
  week52Distance: number | null;
  relativeVolume: number | null;
  barChange: number | null;
  highs: number[];
  closes: number[];
};

const SPAN: Record<ScreenInterval, number> = {
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1wk": 7 * 86_400_000,
};

/** Son mumun periyodu kapanmadıysa onu at. Gösterge yalnız kapanmış mumdan okunur. */
export function closedBars<T extends { time?: string }>(bars: T[], interval: ScreenInterval, now = new Date()): T[] {
  if (!bars.length) return bars;
  const last = Date.parse(bars[bars.length - 1].time ?? "");
  if (!Number.isFinite(last)) return bars;
  if (now.getTime() < last + SPAN[interval]) return bars.slice(0, -1);
  return bars;
}

function last<T>(values: T[]): T | null {
  return values.length ? values[values.length - 1] : null;
}

function at(values: Array<number | null>, index: number): number | null {
  if (index < 0 || index >= values.length) return null;
  const value = values[index];
  return value == null || !Number.isFinite(value) ? null : value;
}

export function crossedUp(prevLeft: number | null, prevRight: number | null, left: number | null, right: number | null): boolean | null {
  if (prevLeft == null || prevRight == null || left == null || right == null) return null;
  return prevLeft <= prevRight && left > right;
}

export function crossedDown(prevLeft: number | null, prevRight: number | null, left: number | null, right: number | null): boolean | null {
  if (prevLeft == null || prevRight == null || left == null || right == null) return null;
  return prevLeft >= prevRight && left < right;
}

export function brokeRecord(highs: number[], closes: number[], within: number): boolean | null {
  const window = Math.floor(within);
  if (highs.length < 2 || closes.length !== highs.length || !(window > 0)) return null;
  const start = Math.max(1, closes.length - window);
  for (let index = start; index < closes.length; index += 1) {
    let max = -Infinity;
    for (let prev = 0; prev < index; prev += 1) max = Math.max(max, highs[prev]);
    if (closes[index] > max) return true;
  }
  return false;
}

export function brokePriorHigh(highs: number[], closes: number[], window: number): boolean | null {
  const length = Math.floor(window);
  const index = closes.length - 1;
  if (highs.length !== closes.length || index < length || length < 1) return null;
  let max = -Infinity;
  for (let prev = index - length; prev < index; prev += 1) max = Math.max(max, highs[prev]);
  return closes[index] > max;
}

export function distanceToHigh(highs: number[], close: number, window = 252): number | null {
  if (!highs.length || !(close > 0)) return null;
  const start = Math.max(0, highs.length - Math.floor(window));
  let max = -Infinity;
  for (let index = start; index < highs.length; index += 1) max = Math.max(max, highs[index]);
  if (!(max > 0)) return null;
  return ((max - close) / max) * 100;
}

function above(left: number | null, right: number | null): boolean | null {
  if (left == null || right == null) return null;
  return left > right;
}

export function snapshotFromBars(bars: BarPoint[]): TechnicalSnapshot | null {
  if (bars.length < 2) return null;
  const closes = bars.map((bar) => bar.close);
  const highs = bars.map((bar) => bar.high);
  const lastIndex = closes.length - 1;
  const prevIndex = lastIndex - 1;
  const close = closes[lastIndex];
  const prevClose = closes[prevIndex];
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, 100);
  const ema200 = ema(closes, 200);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsiSeries = rsi(closes, 14);
  const macdSeries = macd(closes, 12, 26, 9);
  const adxSeries = adx(bars, 14);
  const atrSeries = atr(bars, 14);
  const stoch = stochastic(bars, 14, 3);
  const bands = bollinger(closes, 20, 2);
  const trend = supertrend(bars, 10, 3);
  const prior = bars.slice(0, -1);
  const channel = donchian(prior, 20);
  const e20 = at(ema20, lastIndex);
  const e50 = at(ema50, lastIndex);
  const e100 = at(ema100, lastIndex);
  const e200 = at(ema200, lastIndex);
  const prevE20 = at(ema20, prevIndex);
  const prevE50 = at(ema50, prevIndex);
  const prevE200 = at(ema200, prevIndex);
  const macdNow = at(macdSeries.macd, lastIndex);
  const macdPrev = at(macdSeries.macd, prevIndex);
  const signalNow = at(macdSeries.signal, lastIndex);
  const signalPrev = at(macdSeries.signal, prevIndex);
  const upper = at(bands.upper, lastIndex);
  const lower = at(bands.lower, lastIndex);
  const sma50Now = at(sma50, lastIndex);
  const past = prevIndex >= 20 ? closes[lastIndex - 20] : null;
  let volumeSum = 0;
  let volumeCount = 0;
  for (let index = Math.max(0, lastIndex - 20); index < lastIndex; index += 1) {
    const volume = bars[index].volume;
    if (volume != null && volume > 0) {
      volumeSum += volume;
      volumeCount += 1;
    }
  }
  const lastVolume = bars[lastIndex].volume;
  const relativeVolume = lastVolume != null && lastVolume > 0 && volumeCount > 0 ? lastVolume / (volumeSum / volumeCount) : null;
  const span = upper != null && lower != null ? upper - lower : null;

  return {
    close,
    ema20: e20,
    ema50: e50,
    ema100: e100,
    ema200: e200,
    sma20: at(sma20, lastIndex),
    sma50: sma50Now,
    sma200: at(sma200, lastIndex),
    rsi: at(rsiSeries, lastIndex),
    macd: macdNow,
    macdSignal: signalNow,
    adx: at(adxSeries, lastIndex),
    atr: at(atrSeries, lastIndex),
    stochK: at(stoch.k, lastIndex),
    bbUpper: upper,
    bbLower: lower,
    bbPercent: span != null && span !== 0 ? ((close - lower!) / span) * 100 : null,
    supertrend: at(trend.line, lastIndex),
    supertrendUp: trend.direction[lastIndex] == null ? null : trend.direction[lastIndex] === "up",
    donchianUpper: last(channel.upper),
    aboveEma20: above(close, e20),
    aboveEma200: above(close, e200),
    emaBullStack: e20 != null && e50 != null && e200 != null ? e20 > e50 && e50 > e200 : null,
    ema20AboveEma50: above(e20, e50),
    emaCrossUp: crossedUp(prevE20, prevE50, e20, e50),
    emaCrossDown: crossedDown(prevE20, prevE50, e20, e50),
    priceEma20Above: above(close, e20),
    priceEma20CrossUp: crossedUp(prevClose, prevE20, close, e20),
    priceEma20CrossDown: crossedDown(prevClose, prevE20, close, e20),
    priceEma200Above: above(close, e200),
    priceEma200CrossUp: crossedUp(prevClose, prevE200, close, e200),
    priceEma200CrossDown: crossedDown(prevClose, prevE200, close, e200),
    macdAbove: above(macdNow, signalNow),
    macdCrossUp: crossedUp(macdPrev, signalPrev, macdNow, signalNow),
    macdCrossDown: crossedDown(macdPrev, signalPrev, macdNow, signalNow),
    rsiAbove50: at(rsiSeries, lastIndex) == null ? null : at(rsiSeries, lastIndex)! > 50,
    adxAbove25: at(adxSeries, lastIndex) == null ? null : at(adxSeries, lastIndex)! > 25,
    declineAboveSupport: sma50Now == null || past == null ? null : close < past && close > sma50Now,
    week52Distance: distanceToHigh(highs, close, 252),
    relativeVolume,
    barChange: prevClose ? ((close - prevClose) / prevClose) * 100 : null,
    highs,
    closes,
  };
}

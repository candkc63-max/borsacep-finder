/**
 * Bar Replay için zamana duyarlı indikatörler.
 * Bütün hesaplamalar mum dizisinin bir kısmı (current bar dahil) üzerinde yapılır.
 *
 * Convention: candles[0] = en eski, candles[length-1] = current/latest.
 */

import type { HistoryCandle } from "./types";

export interface IndicatorPoint {
  t: number;
  v: number | null;
}

/** SMA — Simple Moving Average */
export function sma(candles: HistoryCandle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 < period) {
      out.push({ t: candles[i].t, v: null });
      continue;
    }
    let sum = 0;
    for (let j = i + 1 - period; j <= i; j++) sum += candles[j].c;
    out.push({ t: candles[i].t, v: sum / period });
  }
  return out;
}

/** EMA — Exponential Moving Average */
export function ema(candles: HistoryCandle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length === 0) return out;
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 < period) {
      out.push({ t: candles[i].t, v: null });
      continue;
    }
    if (prev === null) {
      // SMA seed
      let sum = 0;
      for (let j = i + 1 - period; j <= i; j++) sum += candles[j].c;
      prev = sum / period;
    } else {
      prev = candles[i].c * k + prev * (1 - k);
    }
    out.push({ t: candles[i].t, v: prev });
  }
  return out;
}

/** RSI 14 */
export function rsi(candles: HistoryCandle[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length === 0) return out;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      out.push({ t: candles[i].t, v: null });
      continue;
    }
    const diff = candles[i].c - candles[i - 1].c;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out.push({ t: candles[i].t, v: 100 - 100 / (1 + rs) });
      } else {
        out.push({ t: candles[i].t, v: null });
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out.push({ t: candles[i].t, v: 100 - 100 / (1 + rs) });
    }
  }
  return out;
}

/** MACD: 12/26/9 */
export interface MacdPoint {
  t: number;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function macd(candles: HistoryCandle[]): MacdPoint[] {
  const e12 = ema(candles, 12);
  const e26 = ema(candles, 26);
  const macdLine: IndicatorPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (e12[i].v == null || e26[i].v == null) {
      macdLine.push({ t: candles[i].t, v: null });
    } else {
      macdLine.push({ t: candles[i].t, v: (e12[i].v as number) - (e26[i].v as number) });
    }
  }
  // Signal = EMA(macdLine, 9)
  const signal: IndicatorPoint[] = [];
  const k = 2 / 10;
  let prev: number | null = null;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i].v == null) {
      signal.push({ t: macdLine[i].t, v: null });
      continue;
    }
    if (prev === null) {
      // SMA seed son 9 değer
      let sum = 0,
        n = 0;
      for (let j = Math.max(0, i - 8); j <= i; j++) {
        if (macdLine[j].v != null) {
          sum += macdLine[j].v as number;
          n++;
        }
      }
      if (n < 9) {
        signal.push({ t: macdLine[i].t, v: null });
        continue;
      }
      prev = sum / 9;
    } else {
      prev = (macdLine[i].v as number) * k + prev * (1 - k);
    }
    signal.push({ t: macdLine[i].t, v: prev });
  }

  const out: MacdPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    const m = macdLine[i].v;
    const s = signal[i].v;
    out.push({
      t: candles[i].t,
      macd: m,
      signal: s,
      histogram: m != null && s != null ? m - s : null,
    });
  }
  return out;
}

/** Bollinger Bands (20, 2) */
export interface BollingerPoint {
  t: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function bollinger(
  candles: HistoryCandle[],
  period = 20,
  multiplier = 2,
): BollingerPoint[] {
  const out: BollingerPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 < period) {
      out.push({ t: candles[i].t, upper: null, middle: null, lower: null });
      continue;
    }
    let sum = 0;
    for (let j = i + 1 - period; j <= i; j++) sum += candles[j].c;
    const mean = sum / period;
    let varSum = 0;
    for (let j = i + 1 - period; j <= i; j++) varSum += (candles[j].c - mean) ** 2;
    const std = Math.sqrt(varSum / period);
    out.push({
      t: candles[i].t,
      upper: mean + multiplier * std,
      middle: mean,
      lower: mean - multiplier * std,
    });
  }
  return out;
}

/** Stochastic %K (14) %D (3) */
export interface StochasticPoint {
  t: number;
  k: number | null;
  d: number | null;
}

export function stochastic(
  candles: HistoryCandle[],
  kPeriod = 14,
  dPeriod = 3,
): StochasticPoint[] {
  const kVals: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 < kPeriod) {
      kVals.push(null);
      continue;
    }
    let lo = Infinity,
      hi = -Infinity;
    for (let j = i + 1 - kPeriod; j <= i; j++) {
      if (candles[j].l < lo) lo = candles[j].l;
      if (candles[j].h > hi) hi = candles[j].h;
    }
    if (hi === lo) kVals.push(50);
    else kVals.push(((candles[i].c - lo) / (hi - lo)) * 100);
  }
  const out: StochasticPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    const k = kVals[i];
    let d: number | null = null;
    if (i + 1 >= dPeriod) {
      const slice = kVals.slice(i + 1 - dPeriod, i + 1);
      if (slice.every((v) => v != null)) {
        d = (slice as number[]).reduce((a, b) => a + b, 0) / dPeriod;
      }
    }
    out.push({ t: candles[i].t, k, d });
  }
  return out;
}

/** ATR (Average True Range) — volatilite ölçer */
export function atr(candles: HistoryCandle[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].h - candles[i].l);
      out.push({ t: candles[i].t, v: null });
      continue;
    }
    const tr = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i - 1].c),
      Math.abs(candles[i].l - candles[i - 1].c),
    );
    trs.push(tr);

    if (i + 1 < period) {
      out.push({ t: candles[i].t, v: null });
      continue;
    }

    if (i + 1 === period) {
      const sum = trs.slice(0, period).reduce((a, b) => a + b, 0);
      out.push({ t: candles[i].t, v: sum / period });
    } else {
      const prevAtr = out[i - 1].v as number;
      out.push({ t: candles[i].t, v: (prevAtr * (period - 1) + tr) / period });
    }
  }
  return out;
}

/** VWAP — kümülatif (oturum bazlı değil, tarihten itibaren) */
export function vwap(candles: HistoryCandle[]): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  let cumPv = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].h + candles[i].l + candles[i].c) / 3;
    cumPv += tp * candles[i].v;
    cumV += candles[i].v;
    out.push({ t: candles[i].t, v: cumV > 0 ? cumPv / cumV : null });
  }
  return out;
}

export function ema(values: number[], period: number): Array<number | null> {
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

export function rsi(closes: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = closes.map(() => null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let index = 1; index <= period; index += 1) {
    const diff = closes[index] - closes[index - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  const value = (up: number, down: number) => (down === 0 ? 100 : 100 - 100 / (1 + up / down));
  out[period] = value(gain, loss);
  for (let index = period + 1; index < closes.length; index += 1) {
    const diff = closes[index] - closes[index - 1];
    gain = (gain * (period - 1) + Math.max(diff, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-diff, 0)) / period;
    out[index] = value(gain, loss);
  }
  return out;
}

export type RangeBar = { high: number; low: number; close: number };

function trueRange(bars: RangeBar[], index: number) {
  const span = bars[index].high - bars[index].low;
  if (index === 0) return span;
  const previous = bars[index - 1].close;
  return Math.max(span, Math.abs(bars[index].high - previous), Math.abs(bars[index].low - previous));
}

/** Wilder ATR. İlk değer, ilk `period` gerçek aralığın ortalamasıdır. Sonraki değer (önceki × (n-1) + TR) / n. */
export function atr(bars: RangeBar[], period: number): Array<number | null> {
  const out: Array<number | null> = bars.map(() => null);
  if (period < 1 || bars.length < period) return out;
  let seed = 0;
  for (let index = 0; index < period; index += 1) seed += trueRange(bars, index);
  let previous = seed / period;
  out[period - 1] = previous;
  for (let index = period; index < bars.length; index += 1) {
    previous = (previous * (period - 1) + trueRange(bars, index)) / period;
    out[index] = previous;
  }
  return out;
}

/**
 * Wilder ADX. +DM ve -DM 1. bardan başlar. İlk `period` örnek (1..period) toplanır.
 * İlk DX, 0 tabanlı `period` indeksindedir. İlk ADX, ilk `period` DX değerinin ortalamasıdır
 * ve 0 tabanlı `2 * period - 1` indeksindedir. Sonraki ADX (önceki × (n-1) + DX) / n.
 */
export function adx(bars: RangeBar[], period: number): Array<number | null> {
  const out: Array<number | null> = bars.map(() => null);
  if (period < 1 || bars.length <= period * 2) return out;
  const plus: number[] = [0];
  const minus: number[] = [0];
  const range: number[] = [trueRange(bars, 0)];
  for (let index = 1; index < bars.length; index += 1) {
    const up = bars[index].high - bars[index - 1].high;
    const down = bars[index - 1].low - bars[index].low;
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
    range.push(trueRange(bars, index));
  }
  let smoothPlus = 0;
  let smoothMinus = 0;
  let smoothRange = 0;
  for (let index = 1; index <= period; index += 1) {
    smoothPlus += plus[index];
    smoothMinus += minus[index];
    smoothRange += range[index];
  }
  const dxAt = (plusSum: number, minusSum: number, rangeSum: number) => {
    if (!(rangeSum > 0)) return 0;
    const plusDi = 100 * plusSum / rangeSum;
    const minusDi = 100 * minusSum / rangeSum;
    const total = plusDi + minusDi;
    return total === 0 ? 0 : 100 * Math.abs(plusDi - minusDi) / total;
  };
  const dx: Array<number | null> = bars.map(() => null);
  dx[period] = dxAt(smoothPlus, smoothMinus, smoothRange);
  for (let index = period + 1; index < bars.length; index += 1) {
    smoothPlus = smoothPlus - smoothPlus / period + plus[index];
    smoothMinus = smoothMinus - smoothMinus / period + minus[index];
    smoothRange = smoothRange - smoothRange / period + range[index];
    dx[index] = dxAt(smoothPlus, smoothMinus, smoothRange);
  }
  const first = period * 2;
  let seed = 0;
  for (let index = period; index < first; index += 1) seed += dx[index] ?? 0;
  let previous = seed / period;
  out[first - 1] = previous;
  for (let index = first; index < bars.length; index += 1) {
    previous = (previous * (period - 1) + (dx[index] ?? 0)) / period;
    out[index] = previous;
  }
  return out;
}

export function replaySlice<T>(rows: T[], cursor: number): T[] {
  return rows.slice(0, Math.max(0, Math.min(rows.length, cursor + 1)));
}

export function stepCursor(cursor: number, delta: number, last: number): number {
  return Math.max(0, Math.min(last, cursor + delta));
}

export function replayDelay(speed: number): number {
  return 1000 / speed;
}

export function replayFocus(cursor: number, span: number): { startValue: number; endValue: number; axisMin: number; axisMax: number } {
  const candles = Math.max(30, Math.round(span));
  const pad = Math.max(4, Math.round((candles * 0.15) / 0.85));
  const endValue = cursor + pad;
  const startValue = endValue - candles - pad;
  return { startValue, endValue, axisMin: startValue, axisMax: endValue };
}

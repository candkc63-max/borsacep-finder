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

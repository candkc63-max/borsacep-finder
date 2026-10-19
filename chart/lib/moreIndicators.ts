import { adx, atr, ema, rsi, type RangeBar } from "./indicators";

export type Series = Array<number | null>;

/** Basit ortalama. İlk değer `period - 1` indeksindedir. */
export function sma(values: number[], period: number): Series {
  const out: Series = values.map(() => null);
  if (period < 1) return out;
  for (let index = period - 1; index < values.length; index += 1) {
    let sum = 0;
    for (let offset = 0; offset < period; offset += 1) sum += values[index - period + 1 + offset];
    out[index] = sum / period;
  }
  return out;
}

/** Doğrusal ağırlıklı ortalama. En yeni kapanışın ağırlığı periyoda eşittir. */
export function wma(values: number[], period: number): Series {
  const out: Series = values.map(() => null);
  if (period < 1) return out;
  const denom = (period * (period + 1)) / 2;
  for (let index = period - 1; index < values.length; index += 1) {
    let sum = 0;
    for (let offset = 0; offset < period; offset += 1) sum += values[index - period + 1 + offset] * (offset + 1);
    out[index] = sum / denom;
  }
  return out;
}

function wmaAligned(values: Series, period: number): Series {
  const out: Series = values.map(() => null);
  if (period < 1) return out;
  const denom = (period * (period + 1)) / 2;
  for (let index = period - 1; index < values.length; index += 1) {
    let sum = 0;
    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - period + 1 + offset];
      if (value == null) {
        sum = Number.NaN;
        break;
      }
      sum += value * (offset + 1);
    }
    if (Number.isFinite(sum)) out[index] = sum / denom;
  }
  return out;
}

/** Hull MA. Yarım periyot tabana yuvarlanır, kök periyot en yakına yuvarlanır. */
export function hma(values: number[], period: number): Series {
  if (period < 1) return values.map(() => null);
  const half = Math.max(1, Math.floor(period / 2));
  const root = Math.max(1, Math.round(Math.sqrt(period)));
  const fast = wma(values, half);
  const slow = wma(values, period);
  const raw = values.map((_, index) => {
    const left = fast[index];
    const right = slow[index];
    return left == null || right == null ? null : 2 * left - right;
  });
  return wmaAligned(raw, root);
}

function emaFrom(values: Series, period: number): Series {
  const out: Series = values.map(() => null);
  if (period < 1) return out;
  const weight = 2 / (period + 1);
  let sum = 0;
  let count = 0;
  let previous: number | null = null;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value == null) continue;
    count += 1;
    if (count < period) {
      sum += value;
      continue;
    }
    if (previous == null) {
      sum += value;
      previous = sum / period;
    } else previous = value * weight + previous * (1 - weight);
    out[index] = previous;
  }
  return out;
}

function smaFrom(values: Series, period: number): Series {
  const out: Series = values.map(() => null);
  if (period < 1) return out;
  for (let index = 0; index < values.length; index += 1) {
    if (index < period - 1) continue;
    let sum = 0;
    let ok = true;
    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - period + 1 + offset];
      if (value == null) {
        ok = false;
        break;
      }
      sum += value;
    }
    if (ok) out[index] = sum / period;
  }
  return out;
}

/** MACD, projedeki SMA tohumlu EMA ile. Sinyal çizgisi MACD değerlerinin EMA'sıdır. */
export function macd(closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const line = closes.map((_, index) => (fast[index] == null || slow[index] == null ? null : fast[index]! - slow[index]!));
  const signal = emaFrom(line, signalPeriod);
  const histogram = line.map((value, index) => (value == null || signal[index] == null ? null : value - signal[index]!));
  return { macd: line, signal, histogram };
}

/** Stochastic. Aralık sıfırsa %K 0 kabul edilir. %D, %K değerlerinin basit ortalamasıdır. */
export function stochastic(bars: RangeBar[], period: number, smooth: number) {
  const k: Series = bars.map(() => null);
  if (period >= 1) {
    for (let index = period - 1; index < bars.length; index += 1) {
      let high = -Infinity;
      let low = Infinity;
      for (let offset = 0; offset < period; offset += 1) {
        high = Math.max(high, bars[index - offset].high);
        low = Math.min(low, bars[index - offset].low);
      }
      const span = high - low;
      k[index] = span === 0 ? 0 : (100 * (bars[index].close - low)) / span;
    }
  }
  return { k, d: smaFrom(k, smooth) };
}

/** Bollinger. Orta çizgi SMA, sapma evren standart sapmasıdır (bölen periyottur). */
export function bollinger(closes: number[], period: number, mult: number) {
  const middle = sma(closes, period);
  const upper: Series = closes.map(() => null);
  const lower: Series = closes.map(() => null);
  for (let index = 0; index < closes.length; index += 1) {
    const mean = middle[index];
    if (mean == null || !(mult >= 0)) continue;
    let variance = 0;
    for (let offset = 0; offset < period; offset += 1) {
      const delta = closes[index - period + 1 + offset] - mean;
      variance += delta * delta;
    }
    const deviation = Math.sqrt(variance / period);
    upper[index] = mean + mult * deviation;
    lower[index] = mean - mult * deviation;
  }
  return { upper, middle, lower };
}

/** Keltner. Orta çizgi EMA, bant Wilder ATR kadardır. İkisi de hazır olmadan değer yok. */
export function keltner(bars: RangeBar[], period: number, atrPeriod: number, mult: number) {
  const middle = ema(bars.map((bar) => bar.close), period);
  const ranges = atr(bars, atrPeriod);
  const upper: Series = bars.map(() => null);
  const lower: Series = bars.map(() => null);
  for (let index = 0; index < bars.length; index += 1) {
    if (middle[index] == null || ranges[index] == null || !(mult >= 0)) continue;
    upper[index] = middle[index]! + mult * ranges[index]!;
    lower[index] = middle[index]! - mult * ranges[index]!;
  }
  return { upper, middle, lower };
}

/** Donchian. Üst ve alt bant, sinyal mumu dahil son `period` mumun yüksek ve düşüğüdür. */
export function donchian(bars: RangeBar[], period: number) {
  const upper: Series = bars.map(() => null);
  const lower: Series = bars.map(() => null);
  const middle: Series = bars.map(() => null);
  if (period < 1) return { upper, middle, lower };
  for (let index = period - 1; index < bars.length; index += 1) {
    let high = -Infinity;
    let low = Infinity;
    for (let offset = 0; offset < period; offset += 1) {
      high = Math.max(high, bars[index - offset].high);
      low = Math.min(low, bars[index - offset].low);
    }
    upper[index] = high;
    lower[index] = low;
    middle[index] = (high + low) / 2;
  }
  return { upper, middle, lower };
}

/**
 * Supertrend. ATR Wilder. İlk bantlar temel banttır.
 * Kapanış üst bandın üstüne çıkarsa yön yukarı, alt bandın altına inerse yön aşağı döner.
 * Çizgi yukarı yönde alt bant, aşağı yönde üst banttır.
 */
export function supertrend(bars: RangeBar[], period: number, mult: number) {
  const ranges = atr(bars, period);
  const line: Series = bars.map(() => null);
  const direction: Array<"up" | "down" | null> = bars.map(() => null);
  let previousUpper = 0;
  let previousLower = 0;
  let previousDirection: "up" | "down" | null = null;
  for (let index = 0; index < bars.length; index += 1) {
    const range = ranges[index];
    if (range == null) continue;
    const mid = (bars[index].high + bars[index].low) / 2;
    const basicUpper = mid + mult * range;
    const basicLower = mid - mult * range;
    const finalUpper = previousDirection == null
      ? basicUpper
      : basicUpper < previousUpper || bars[index - 1].close > previousUpper
        ? basicUpper
        : previousUpper;
    const finalLower = previousDirection == null
      ? basicLower
      : basicLower > previousLower || bars[index - 1].close < previousLower
        ? basicLower
        : previousLower;
    const next = previousDirection == null
      ? bars[index].close >= mid ? "up" : "down"
      : previousDirection === "down" && bars[index].close > finalUpper
        ? "up"
        : previousDirection === "up" && bars[index].close < finalLower
          ? "down"
          : previousDirection;
    direction[index] = next;
    line[index] = next === "up" ? finalLower : finalUpper;
    previousUpper = finalUpper;
    previousLower = finalLower;
    previousDirection = next;
  }
  return { line, direction };
}

/** CCI. Tipik fiyatın SMA'sı ve aynı penceredeki ortalama sapma. Sapma 0 ise CCI 0. */
export function cci(bars: RangeBar[], period: number): Series {
  const typical = bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
  const mean = sma(typical, period);
  const out: Series = bars.map(() => null);
  if (period < 1) return out;
  for (let index = period - 1; index < bars.length; index += 1) {
    const center = mean[index];
    if (center == null) continue;
    let deviation = 0;
    for (let offset = 0; offset < period; offset += 1) deviation += Math.abs(typical[index - offset] - center);
    deviation /= period;
    out[index] = deviation === 0 ? 0 : (typical[index] - center) / (0.015 * deviation);
  }
  return out;
}

/** ROC. Yüzde değişim, `period` mum önceki kapanışa göredir. Önceki kapanış 0 ise değer yok. */
export function roc(closes: number[], period: number): Series {
  const out: Series = closes.map(() => null);
  if (period < 1) return out;
  for (let index = period; index < closes.length; index += 1) {
    const base = closes[index - period];
    if (base === 0) continue;
    out[index] = (100 * (closes[index] - base)) / base;
  }
  return out;
}

/** OBV. Hacim yoksa 0 sayılır. Eşit kapanışta toplam değişmez. */
export function obv(bars: Array<{ close: number; volume: number | null }>): Series {
  const out: Series = [];
  let total = 0;
  bars.forEach((bar, index) => {
    if (index > 0) {
      const volume = bar.volume ?? 0;
      if (bar.close > bars[index - 1].close) total += volume;
      else if (bar.close < bars[index - 1].close) total -= volume;
    }
    out.push(total);
  });
  return out;
}

/**
 * VWAP. Tipik fiyat × hacim, serinin başından birikir. Seans sıfırlaması yok.
 * Hacim yoksa veya toplam hacim sıfırsa değer yok.
 */
export type LineName =
  | "sma" | "ema" | "wma" | "hma" | "rsi" | "adx" | "atr" | "cci" | "roc" | "obv" | "vwap"
  | "macd" | "stoch" | "bb" | "keltner" | "donchian" | "supertrend";

export type LineSpec = {
  name: LineName;
  period: number;
  fast: number;
  slow: number;
  signal: number;
  mult: number;
  atrPeriod: number;
  smooth: number;
  line: string;
};

const PRICE_PANE = new Set<LineName>(["sma", "ema", "wma", "hma", "vwap", "bb", "keltner", "donchian", "supertrend"]);

export function studyPane(name: LineName): "price" | "osc" {
  return PRICE_PANE.has(name) ? "price" : "osc";
}

export function indicatorLine(bars: Array<RangeBar & { volume?: number | null }>, spec: LineSpec): Series {
  const closes = bars.map((bar) => bar.close);
  if (spec.name === "sma") return sma(closes, spec.period);
  if (spec.name === "ema") return ema(closes, spec.period);
  if (spec.name === "wma") return wma(closes, spec.period);
  if (spec.name === "hma") return hma(closes, spec.period);
  if (spec.name === "rsi") return rsi(closes, spec.period);
  if (spec.name === "adx") return adx(bars, spec.period);
  if (spec.name === "atr") return atr(bars, spec.period);
  if (spec.name === "cci") return cci(bars, spec.period);
  if (spec.name === "roc") return roc(closes, spec.period);
  if (spec.name === "obv") return obv(bars.map((bar) => ({ close: bar.close, volume: bar.volume ?? null })));
  if (spec.name === "vwap") return vwap(bars.map((bar) => ({ high: bar.high, low: bar.low, close: bar.close, volume: bar.volume ?? null })));
  if (spec.name === "macd") {
    const value = macd(closes, spec.fast, spec.slow, spec.signal);
    if (spec.line === "signal") return value.signal;
    if (spec.line === "histogram") return value.histogram;
    return value.macd;
  }
  if (spec.name === "stoch") {
    const value = stochastic(bars, spec.period, spec.smooth);
    return spec.line === "d" ? value.d : value.k;
  }
  if (spec.name === "bb") {
    const value = bollinger(closes, spec.period, spec.mult);
    if (spec.line === "upper") return value.upper;
    if (spec.line === "lower") return value.lower;
    return value.middle;
  }
  if (spec.name === "keltner") {
    const value = keltner(bars, spec.period, spec.atrPeriod, spec.mult);
    if (spec.line === "upper") return value.upper;
    if (spec.line === "lower") return value.lower;
    return value.middle;
  }
  if (spec.name === "donchian") {
    const value = donchian(bars, spec.period);
    if (spec.line === "upper") return value.upper;
    if (spec.line === "lower") return value.lower;
    return value.middle;
  }
  return supertrend(bars, spec.period, spec.mult).line;
}

export function vwap(bars: Array<{ high: number; low: number; close: number; volume: number | null }>): Series {
  const out: Series = [];
  let priced = 0;
  let volume = 0;
  for (const bar of bars) {
    const size = bar.volume ?? 0;
    if (size > 0) {
      priced += ((bar.high + bar.low + bar.close) / 3) * size;
      volume += size;
    }
    out.push(volume > 0 ? priced / volume : null);
  }
  return out;
}

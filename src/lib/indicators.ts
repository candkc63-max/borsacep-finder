// Technical indicator calculations

/** Pullback tolerance: price within +/- 0.5% of EMA is considered pullback zone */
const PULLBACK_TOLERANCE = 0.005;

export function calcSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Calculate Exponential Moving Average.
 * @param prices - Array of closing prices, newest first (prices[0] = today)
 * @param period - EMA period (e.g. 5, 9, 22)
 * @returns The current EMA value, or null if insufficient data
 */
export function calcEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  // Convert to chronological order (oldest first) for forward-pass EMA.
  // Limit lookback to period*3 — beyond that, impact on EMA is negligible.
  const chronological = prices.slice(0, Math.min(prices.length, period * 3)).reverse();
  const k = 2 / (period + 1);
  let ema = chronological.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < chronological.length; i++) {
    ema = chronological[i] * k + ema * (1 - k);
  }
  return ema;
}

// Previous day's EMA (shift prices by 1)
export function calcPrevEMA(prices: number[], period: number): number | null {
  return calcEMA(prices.slice(1), period);
}

export function calcPrevSMA(prices: number[], period: number): number | null {
  return calcSMA(prices.slice(1), period);
}

/** Calculate RSI (Relative Strength Index) */
export function calcRSI(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const chronological = prices.slice(0, period + 1).reverse();
  let gains = 0, losses = 0;
  for (let i = 1; i < chronological.length; i++) {
    const diff = chronological[i] - chronological[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Calculate Bollinger Bands */
export function calcBollinger(prices: number[], period = 20, multiplier = 2): { upper: number; middle: number; lower: number } | null {
  const sma = calcSMA(prices, period);
  if (!sma || prices.length < period) return null;
  const slice = prices.slice(0, period);
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: sma + multiplier * std, middle: sma, lower: sma - multiplier * std };
}

/** Calculate MACD */
export function calcMACD(prices: number[]): { macd: number; signal: number; histogram: number } | null {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  if (!ema12 || !ema26) return null;
  const macd = ema12 - ema26;
  // Simplified: use 9-period approximation for signal line
  const macdValues: number[] = [];
  for (let i = 0; i < Math.min(9, prices.length - 26); i++) {
    const e12 = calcEMA(prices.slice(i), 12);
    const e26 = calcEMA(prices.slice(i), 26);
    if (e12 && e26) macdValues.push(e12 - e26);
  }
  if (macdValues.length < 9) return { macd, signal: macd, histogram: 0 };
  const signal = macdValues.reduce((a, b) => a + b, 0) / macdValues.length;
  return { macd, signal, histogram: macd - signal };
}

/**
 * Detects EMA crossover that occurred on the latest bar.
 * Returns "golden" if fast crossed above slow today, "death" if fast crossed below today.
 */
export function detectEmaCross(prices: number[], fast = 5, slow = 22): "golden" | "death" | null {
  const ef = calcEMA(prices, fast);
  const es = calcEMA(prices, slow);
  const pef = calcPrevEMA(prices, fast);
  const pes = calcPrevEMA(prices, slow);
  if (ef == null || es == null || pef == null || pes == null) return null;
  if (pef <= pes && ef > es) return "golden";
  if (pef >= pes && ef < es) return "death";
  return null;
}

/** Detects MACD signal-line crossover on the latest bar. */
export function detectMacdCross(prices: number[]): "bullish_cross" | "bearish_cross" | null {
  const cur = calcMACD(prices);
  const prev = calcMACD(prices.slice(1));
  if (!cur || !prev) return null;
  const curDiff = cur.macd - cur.signal;
  const prevDiff = prev.macd - prev.signal;
  if (prevDiff <= 0 && curDiff > 0) return "bullish_cross";
  if (prevDiff >= 0 && curDiff < 0) return "bearish_cross";
  return null;
}

/**
 * Bollinger band state for the latest bar.
 * - "upper": price within 1% of upper band
 * - "lower": price within 1% of lower band
 * - "squeeze": band width (upper-lower)/middle < 0.08 (8%)
 */
export function detectBollingerState(prices: number[]): "upper" | "lower" | "squeeze" | null {
  const bb = calcBollinger(prices, 20, 2);
  if (!bb) return null;
  const price = prices[0];
  const width = (bb.upper - bb.lower) / bb.middle;
  if (width < 0.08) return "squeeze";
  if (price >= bb.upper * 0.99) return "upper";
  if (price <= bb.lower * 1.01) return "lower";
  return null;
}

/** True if today's volume is at least `multiplier`x the trailing 20-day average. */
export function isVolumeSpike(volumes: number[] | undefined, multiplier = 2, period = 20): boolean {
  if (!volumes || volumes.length < period + 1) return false;
  const today = volumes[0];
  const avg = volumes.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  if (avg <= 0) return false;
  return today >= avg * multiplier;
}

// ─── Ek Gelişmiş Filtre Yardımcıları ───────────────────────────────────────

/**
 * Fiyat verilen SMA periyodunu son `lookback` gün içinde yukarı kırdı mı?
 * (önceki dönem altında, şimdi üstünde)
 */
export function sma200BreakUp(prices: number[], period = 200, lookback = 5): boolean {
  if (prices.length < period + lookback) return false;
  const nowSma = calcSMA(prices, period);
  const nowPrice = prices[0];
  if (!nowSma || nowPrice <= nowSma) return false;
  // lookback gün önce fiyat bu SMA'nın altında olmalı
  const pastPrices = prices.slice(lookback);
  const pastSma = calcSMA(pastPrices, period);
  const pastPrice = prices[lookback];
  if (!pastSma) return false;
  return pastPrice < pastSma;
}

export function sma200BreakDown(prices: number[], period = 200, lookback = 5): boolean {
  if (prices.length < period + lookback) return false;
  const nowSma = calcSMA(prices, period);
  const nowPrice = prices[0];
  if (!nowSma || nowPrice >= nowSma) return false;
  const pastPrices = prices.slice(lookback);
  const pastSma = calcSMA(pastPrices, period);
  const pastPrice = prices[lookback];
  if (!pastSma) return false;
  return pastPrice > pastSma;
}

/**
 * Fiyat verilen SMA periyodunun üstünde mi? (basit konum testi — kırılımdan farklı)
 */
export function priceAboveSma(prices: number[], period: number): boolean {
  const sma = calcSMA(prices, period);
  if (!sma) return false;
  return prices[0] > sma;
}

export function priceBelowSma(prices: number[], period: number): boolean {
  const sma = calcSMA(prices, period);
  if (!sma) return false;
  return prices[0] < sma;
}

/**
 * Son `lookback` gün içinde altın kesişim olmuş mu?
 * (EMA fast, EMA slow'un altındayken üstüne çıktı)
 */
export function recentGoldenCross(
  prices: number[],
  fast = 50,
  slow = 200,
  lookback = 10,
): boolean {
  if (prices.length < slow + lookback) return false;
  const nowFast = calcEMA(prices, fast);
  const nowSlow = calcEMA(prices, slow);
  if (!nowFast || !nowSlow || nowFast <= nowSlow) return false;
  // lookback gün önce fast, slow'un altında olmalı
  const past = prices.slice(lookback);
  const pastFast = calcEMA(past, fast);
  const pastSlow = calcEMA(past, slow);
  if (!pastFast || !pastSlow) return false;
  return pastFast < pastSlow;
}

export function recentDeathCross(
  prices: number[],
  fast = 50,
  slow = 200,
  lookback = 10,
): boolean {
  if (prices.length < slow + lookback) return false;
  const nowFast = calcEMA(prices, fast);
  const nowSlow = calcEMA(prices, slow);
  if (!nowFast || !nowSlow || nowFast >= nowSlow) return false;
  const past = prices.slice(lookback);
  const pastFast = calcEMA(past, fast);
  const pastSlow = calcEMA(past, slow);
  if (!pastFast || !pastSlow) return false;
  return pastFast > pastSlow;
}

/**
 * 52 haftalık (252 işlem günü) zirveye yakın veya yeni zirve kırılımı.
 */
export function is52WeekHighBreak(prices: number[], toleranceDays = 5): boolean {
  if (prices.length < 252) return false;
  const window = prices.slice(0, 252);
  const max = Math.max(...window);
  const today = prices[0];
  // Bugünkü fiyat son 252 günün %99.5+'ına değiyor mu
  if (today < max * 0.995) return false;
  // Son `toleranceDays` gün öncesinden yukarı kırılım olmalı
  for (let i = toleranceDays; i < Math.min(252, prices.length); i++) {
    if (prices[i] >= max * 0.995) return false;
  }
  return true;
}

/**
 * RSI aşırı satım + son 3 gün yukarı yönlü momentum
 * ("dönüş sinyali" — klasik RSI dip avı)
 */
export function rsiOversoldBouncing(prices: number[]): boolean {
  const rsi = calcRSI(prices);
  if (rsi === null || rsi > 35) return false; // 30 biraz esnetilmiş
  // Son 3 gün fiyat yukarı yönlü?
  if (prices.length < 4) return false;
  return prices[0] > prices[1] && prices[1] > prices[2];
}

/**
 * Son 5 günde güçlü momentum:
 * - Fiyat %3+ yukarı
 * - RSI 50'nin üstünde
 * - MACD histogram pozitif
 */
export function strongMomentum(prices: number[]): boolean {
  if (prices.length < 6) return false;
  const chg5 = (prices[0] - prices[5]) / prices[5];
  if (chg5 < 0.03) return false;
  const rsi = calcRSI(prices);
  if (rsi === null || rsi < 50) return false;
  const m = calcMACD(prices);
  if (!m || m.histogram <= 0) return false;
  return true;
}

export type Signal = "AL" | "SAT" | "NÖTR";

export interface StrategyResult {
  symbol: string;
  name: string;
  price: number;
  change: number; // daily % change
  signal: Signal;
  details: string;
  indicators: Record<string, number | null>;
}

export type StrategyId = 
  | "ema5_22"
  | "ema9_sma20"
  | "fib_5_8_13"
  | "trend_50_200"
  | "pullback";

export type Timeframe = "kisa" | "orta" | "uzun";

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  style: string;
  timeframe: Timeframe;
}

export const strategies: Strategy[] = [
  { id: "ema5_22", name: "5 EMA / 22 EMA", description: "Trend değişimlerini erken yakalar", style: "Swing Trade", timeframe: "kisa" },
  { id: "ema9_sma20", name: "9 EMA / 20 SMA", description: "Güçlü trendlerde destek seviyelerini belirler", style: "Momentum", timeframe: "orta" },
  { id: "fib_5_8_13", name: "5-8-13 Fibonacci EMA", description: "Fiyat hareketlerine çok duyarlıdır", style: "Agresif Trade", timeframe: "kisa" },
  { id: "trend_50_200", name: "50 SMA / 200 SMA", description: "Daha az hatalı sinyal üretir", style: "Uzun Vade", timeframe: "uzun" },
  { id: "pullback", name: "Pullback Filtresi", description: "Geri çekilme sonrası giriş noktası", style: "Pullback", timeframe: "orta" },
];

export function applyStrategy(
  symbol: string,
  name: string,
  prices: number[],
  strategyId: StrategyId
): StrategyResult {
  const price = prices[0];
  const prevPrice = prices[1];
  const change = ((price - prevPrice) / prevPrice) * 100;

  switch (strategyId) {
    case "ema5_22": {
      const ema5 = calcEMA(prices, 5);
      const ema22 = calcEMA(prices, 22);
      const prevEma5 = calcPrevEMA(prices, 5);
      const prevEma22 = calcPrevEMA(prices, 22);
      
      let signal: Signal = "NÖTR";
      let details = "";
      if (ema5 && ema22 && prevEma5 && prevEma22) {
        if (prevEma5 <= prevEma22 && ema5 > ema22) {
          signal = "AL"; details = "5 EMA, 22 EMA'yı yukarı kesti (Golden Cross)";
        } else if (prevEma5 >= prevEma22 && ema5 < ema22) {
          signal = "SAT"; details = "5 EMA, 22 EMA'yı aşağı kesti (Death Cross)";
        } else if (ema5 > ema22) {
          signal = "AL"; details = "5 EMA > 22 EMA (Yükseliş trendi)";
        } else {
          signal = "SAT"; details = "5 EMA < 22 EMA (Düşüş trendi)";
        }
      }
      return { symbol, name, price, change, signal, details, indicators: { "EMA 5": ema5, "EMA 22": ema22 } };
    }

    case "ema9_sma20": {
      const ema9 = calcEMA(prices, 9);
      const sma20 = calcSMA(prices, 20);
      let signal: Signal = "NÖTR";
      let details = "";
      if (ema9 && sma20) {
        if (price > ema9 && price > sma20) {
          signal = "AL"; details = "Fiyat her iki ortalamanın üzerinde (Güçlü yükseliş)";
        } else if (price < ema9 && price < sma20) {
          signal = "SAT"; details = "Fiyat her iki ortalamanın altında";
        } else if (price > sma20 && price <= ema9 * (1 + PULLBACK_TOLERANCE) && price >= ema9 * (1 - PULLBACK_TOLERANCE)) {
          signal = "AL"; details = "Fiyat EMA 9'a geri çekildi (Pullback alımı)";
        } else {
          details = "Kararsız bölge";
        }
      }
      return { symbol, name, price, change, signal, details, indicators: { "EMA 9": ema9, "SMA 20": sma20 } };
    }

    case "fib_5_8_13": {
      const ema5 = calcEMA(prices, 5);
      const ema8 = calcEMA(prices, 8);
      const ema13 = calcEMA(prices, 13);
      let signal: Signal = "NÖTR";
      let details = "";
      if (ema5 && ema8 && ema13) {
        if (ema5 > ema8 && ema8 > ema13 && price > ema5) {
          signal = "AL"; details = "Fibonacci EMA'lar yukarı yönlü açılıyor (Güçlü trend)";
        } else if (ema5 < ema8 && ema8 < ema13) {
          signal = "SAT"; details = "Fibonacci EMA'lar aşağı yönlü (Düşüş trendi)";
        } else {
          details = "EMA'lar iç içe geçmiş (Yatay piyasa)";
        }
      }
      return { symbol, name, price, change, signal, details, indicators: { "EMA 5": ema5, "EMA 8": ema8, "EMA 13": ema13 } };
    }

    case "trend_50_200": {
      const sma50 = calcSMA(prices, 50);
      const sma200 = calcSMA(prices, 200);
      const prevSma50 = calcPrevSMA(prices, 50);
      const prevSma200 = calcPrevSMA(prices, 200);
      let signal: Signal = "NÖTR";
      let details = "";
      if (sma50 && sma200 && prevSma50 && prevSma200) {
        if (prevSma50 <= prevSma200 && sma50 > sma200) {
          signal = "AL"; details = "Golden Cross! 50 SMA, 200 SMA'yı yukarı kesti";
        } else if (prevSma50 >= prevSma200 && sma50 < sma200) {
          signal = "SAT"; details = "Death Cross! 50 SMA, 200 SMA'yı aşağı kesti";
        } else if (sma50 > sma200 && price > sma50) {
          signal = "AL"; details = "Güçlü yükseliş trendi (Fiyat > 50 SMA > 200 SMA)";
        } else if (sma50 < sma200) {
          signal = "SAT"; details = "Düşüş trendi (50 SMA < 200 SMA)";
        }
      }
      return { symbol, name, price, change, signal, details, indicators: { "SMA 50": sma50, "SMA 200": sma200 } };
    }

    case "pullback": {
      const sma50 = calcSMA(prices, 50);
      const ema10 = calcEMA(prices, 10);
      const prevEma10 = calcPrevEMA(prices, 10);
      let signal: Signal = "NÖTR";
      let details = "";
      if (sma50 && ema10 && prevEma10) {
        if (price > sma50 && prevPrice < prevEma10 && price > ema10) {
          signal = "AL"; details = "Pullback sinyali! Fiyat EMA 10'un üzerine çıktı";
        } else if (price > sma50 && price < ema10) {
          signal = "NÖTR"; details = "Düzeltme devam ediyor (Fiyat < EMA 10, ana trend yukarı)";
        } else if (price < sma50) {
          signal = "SAT"; details = "Ana trend aşağı (Fiyat < SMA 50)";
        } else {
          details = "Trend yukarı, düzeltme bekleniyor";
        }
      }
      return { symbol, name, price, change, signal, details, indicators: { "SMA 50": sma50, "EMA 10": ema10 } };
    }

    default: {
      const _exhaustive: never = strategyId;
      return {
        symbol, name, price, change,
        signal: "NÖTR" as Signal,
        details: `Bilinmeyen strateji: ${strategyId}`,
        indicators: {},
      };
    }
  }
}

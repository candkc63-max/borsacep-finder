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

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  style: string;
}

export const strategies: Strategy[] = [
  { id: "ema5_22", name: "5 EMA / 22 EMA", description: "Trend değişimlerini erken yakalar", style: "Swing Trade" },
  { id: "ema9_sma20", name: "9 EMA / 20 SMA", description: "Güçlü trendlerde destek seviyelerini belirler", style: "Momentum" },
  { id: "fib_5_8_13", name: "5-8-13 Fibonacci EMA", description: "Fiyat hareketlerine çok duyarlıdır", style: "Agresif Trade" },
  { id: "trend_50_200", name: "50 SMA / 200 SMA", description: "Daha az hatalı sinyal üretir", style: "Orta-Kısa Vade" },
  { id: "pullback", name: "Pullback Filtresi", description: "Geri çekilme sonrası giriş noktası", style: "Pullback" },
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

import type { PortfolioItem } from "@/hooks/usePortfolio";
import type { CoachPortfolioContext } from "./types";

export interface PortfolioPriceSnapshot {
  symbol: string;
  prices: number[];
}

/**
 * Portföy + canlı fiyatlardan koç için özet çıkarır.
 * Boş portföy → null döner (panik modu tetiklenmez).
 */
export function summarizePortfolio(
  portfolio: PortfolioItem[],
  stockData: PortfolioPriceSnapshot[],
): CoachPortfolioContext | null {
  if (portfolio.length === 0) return null;

  let totalInvested = 0;
  let totalCurrent = 0;
  let worst: { symbol: string; pnlPct: number } | null = null;

  for (const item of portfolio) {
    const stock = stockData.find((s) => s.symbol === item.symbol);
    const currentPrice = stock?.prices[0] ?? item.buyPrice;
    const invested = item.buyPrice * item.quantity;
    const current = currentPrice * item.quantity;
    totalInvested += invested;
    totalCurrent += current;

    const pnlPct = ((currentPrice - item.buyPrice) / item.buyPrice) * 100;
    if (!worst || pnlPct < worst.pnlPct) {
      worst = { symbol: item.symbol, pnlPct };
    }
  }

  if (totalInvested <= 0) return null;

  const totalPnlPct = ((totalCurrent - totalInvested) / totalInvested) * 100;

  return {
    totalPnlPct,
    totalValueTl: totalCurrent,
    worstPosition: worst ?? undefined,
  };
}

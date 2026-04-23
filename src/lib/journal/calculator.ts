/**
 * Türkiye BIST komisyon + vergi hesabı.
 *
 * - Komisyon: broker'a göre değişir (~%0.1 - %0.2). Her iki bacakta (alım+satım).
 * - BSMV: Komisyonun %5'i.
 * - Stopaj: Yerli bireysel yatırımcı için hisse senedinde %0 (2025 itibarıyla).
 */

import type { TradeEntry, TradeResult } from "./types";

const BSMV_RATE = 0.05;

export function calculateTradeResult(trade: TradeEntry): TradeResult | null {
  if (trade.status !== "closed" || trade.exitPrice === undefined) {
    return null;
  }

  const entryValue = trade.entryPrice * trade.quantity;
  const exitValue = trade.exitPrice * trade.quantity;

  const grossPnl =
    trade.side === "long" ? exitValue - entryValue : entryValue - exitValue;

  const commissionEntry = entryValue * trade.commissionRate;
  const commissionExit = exitValue * trade.commissionRate;
  const commissionCost = commissionEntry + commissionExit;
  const bsmvCost = commissionCost * BSMV_RATE;

  const netPnl = grossPnl - commissionCost - bsmvCost;
  const netPnlPct = entryValue === 0 ? 0 : (netPnl / entryValue) * 100;

  return { grossPnl, commissionCost, bsmvCost, netPnl, netPnlPct };
}

export function formatTl(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

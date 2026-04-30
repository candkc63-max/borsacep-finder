/**
 * Simülatör motoru — saf hesaplamalar.
 * Pozisyon aç/kapa, otomatik stop/target tetikleme, P&L.
 */

import { BSMV_RATE, type HistoryCandle, type SimPosition } from "./types";

function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function openPosition(args: {
  side: "long" | "short";
  barIdx: number;
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
}): SimPosition {
  return {
    id: generateId(),
    side: args.side,
    status: "open",
    entryBarIdx: args.barIdx,
    entryPrice: args.price,
    quantity: args.quantity,
    stopLoss: args.stopLoss,
    takeProfit: args.takeProfit,
  };
}

export function closePosition(
  pos: SimPosition,
  barIdx: number,
  price: number,
  reason: "manual" | "stop_loss" | "take_profit",
  commissionPct: number,
): SimPosition {
  const grossPnl =
    pos.side === "long"
      ? (price - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - price) * pos.quantity;

  const commissionEntry = pos.entryPrice * pos.quantity * commissionPct;
  const commissionExit = price * pos.quantity * commissionPct;
  const totalCommission = commissionEntry + commissionExit;
  const bsmv = totalCommission * BSMV_RATE;

  const netPnl = grossPnl - totalCommission - bsmv;
  const entryValue = pos.entryPrice * pos.quantity;
  const pnlPct = entryValue === 0 ? 0 : (netPnl / entryValue) * 100;

  return {
    ...pos,
    status: "closed",
    exitBarIdx: barIdx,
    exitPrice: price,
    exitReason: reason,
    netPnl,
    pnlPct,
  };
}

/**
 * Yeni mum geldiğinde açık pozisyonların stop/target seviyelerini kontrol et.
 * Tetiklenenleri kapatılmış olarak döndür.
 */
export function checkStopAndTargets(
  positions: SimPosition[],
  candle: HistoryCandle,
  barIdx: number,
  commissionPct: number,
): { positions: SimPosition[]; closedNow: SimPosition[] } {
  const closedNow: SimPosition[] = [];
  const next = positions.map((p) => {
    if (p.status !== "open") return p;
    if (p.side === "long") {
      // Stop: low <= stopLoss
      if (p.stopLoss !== undefined && candle.l <= p.stopLoss) {
        const closed = closePosition(p, barIdx, p.stopLoss, "stop_loss", commissionPct);
        closedNow.push(closed);
        return closed;
      }
      // Target: high >= takeProfit
      if (p.takeProfit !== undefined && candle.h >= p.takeProfit) {
        const closed = closePosition(p, barIdx, p.takeProfit, "take_profit", commissionPct);
        closedNow.push(closed);
        return closed;
      }
    } else {
      // short
      if (p.stopLoss !== undefined && candle.h >= p.stopLoss) {
        const closed = closePosition(p, barIdx, p.stopLoss, "stop_loss", commissionPct);
        closedNow.push(closed);
        return closed;
      }
      if (p.takeProfit !== undefined && candle.l <= p.takeProfit) {
        const closed = closePosition(p, barIdx, p.takeProfit, "take_profit", commissionPct);
        closedNow.push(closed);
        return closed;
      }
    }
    return p;
  });
  return { positions: next, closedNow };
}

/** Açık pozisyonların güncel mum fiyatına göre unrealized P&L'i */
export function calcOpenPnl(
  positions: SimPosition[],
  currentPrice: number,
  commissionPct: number,
): { totalUnrealized: number; perPosition: Record<string, number> } {
  const per: Record<string, number> = {};
  let total = 0;
  for (const p of positions) {
    if (p.status !== "open") continue;
    const grossPnl =
      p.side === "long"
        ? (currentPrice - p.entryPrice) * p.quantity
        : (p.entryPrice - currentPrice) * p.quantity;
    const commissionEntry = p.entryPrice * p.quantity * commissionPct;
    const commissionExit = currentPrice * p.quantity * commissionPct;
    const totalCommission = commissionEntry + commissionExit;
    const bsmv = totalCommission * BSMV_RATE;
    const net = grossPnl - totalCommission - bsmv;
    per[p.id] = net;
    total += net;
  }
  return { totalUnrealized: total, perPosition: per };
}

/** Realize edilmiş toplam P&L (kapanmış pozisyonlar) */
export function calcRealizedPnl(positions: SimPosition[]): number {
  return positions.reduce(
    (sum, p) => (p.status === "closed" && typeof p.netPnl === "number" ? sum + p.netPnl : sum),
    0,
  );
}

/**
 * Disiplin Skoru (0-100) + A/B/C/D/F notu.
 *
 * 100'den başlar, kötü davranış puan kırar:
 * - Stop-loss planlamama (max -20)
 * - Stop-loss ihlali (8 puan × sayı, max -25)
 * - FOMO alım (5 × sayı, max -20)
 * - Tavsiye ile alım (4 × sayı, max -15)
 * - Panik satış (6 × sayı, max -20)
 * - İntikam işlemi (10 × sayı, max -25)
 */

import { calculateTradeResult } from "./calculator";
import type { TradeEntry } from "./types";

export interface DisciplineBreakdown {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  noStopPlanCount: number;
  ignoredStopCount: number;
  fomoCount: number;
  tipCount: number;
  panicSellCount: number;
  revengeTradeCount: number;
  penalties: Array<{ reason: string; points: number }>;
  repeatedMistakes: string[];
}

function letter(score: number): DisciplineBreakdown["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function computeDiscipline(trades: TradeEntry[]): DisciplineBreakdown {
  const total = trades.length;
  const closed = trades.filter((t) => t.status === "closed");

  let wins = 0;
  for (const t of closed) {
    const r = calculateTradeResult(t);
    if (r && r.netPnl > 0) wins++;
  }
  const winRate = closed.length === 0 ? 0 : (wins / closed.length) * 100;

  const noStopPlan = trades.filter((t) => t.plannedStopLoss == null).length;
  const ignoredStop = trades.filter((t) => t.reasons?.includes("ignored_stop_loss")).length;
  const fomo = trades.filter((t) => t.reasons?.includes("fomo")).length;
  const tip = trades.filter((t) => t.reasons?.includes("tip")).length;
  const panicSell = trades.filter((t) => t.reasons?.includes("panic_sell")).length;
  const revenge = trades.filter((t) => t.reasons?.includes("revenge_trade")).length;

  const penalties: DisciplineBreakdown["penalties"] = [];
  let score = 100;

  if (total > 0) {
    const ratio = noStopPlan / total;
    const p = Math.round(ratio * 20);
    if (p > 0) {
      score -= p;
      penalties.push({
        reason: `Stop planı olmayan işlem: %${Math.round(ratio * 100)}`,
        points: p,
      });
    }
  }
  if (ignoredStop > 0) {
    const p = Math.min(25, ignoredStop * 8);
    score -= p;
    penalties.push({ reason: `Stop'a uyulmayan işlem: ${ignoredStop}`, points: p });
  }
  if (fomo > 0) {
    const p = Math.min(20, fomo * 5);
    score -= p;
    penalties.push({ reason: `FOMO ile alım: ${fomo}`, points: p });
  }
  if (tip > 0) {
    const p = Math.min(15, tip * 4);
    score -= p;
    penalties.push({ reason: `Tavsiye/guru ile alım: ${tip}`, points: p });
  }
  if (panicSell > 0) {
    const p = Math.min(20, panicSell * 6);
    score -= p;
    penalties.push({ reason: `Panik satış: ${panicSell}`, points: p });
  }
  if (revenge > 0) {
    const p = Math.min(25, revenge * 10);
    score -= p;
    penalties.push({ reason: `İntikam işlemi: ${revenge}`, points: p });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const repeated: string[] = [];
  if (fomo >= 3) repeated.push(`${fomo} kez FOMO ile alım`);
  if (ignoredStop >= 2) repeated.push(`${ignoredStop} kez stop'a uymadın`);
  if (panicSell >= 2) repeated.push(`${panicSell} kez panikle sattın`);
  if (revenge >= 2) repeated.push(`${revenge} kez intikam işlemi`);
  if (tip >= 3) repeated.push(`${tip} kez başkasının tavsiyesiyle aldın`);

  return {
    score,
    grade: letter(score),
    totalTrades: total,
    closedTrades: closed.length,
    winRate,
    noStopPlanCount: noStopPlan,
    ignoredStopCount: ignoredStop,
    fomoCount: fomo,
    tipCount: tip,
    panicSellCount: panicSell,
    revengeTradeCount: revenge,
    penalties,
    repeatedMistakes: repeated,
  };
}

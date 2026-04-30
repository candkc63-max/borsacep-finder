/**
 * Bar Replay Simülatörü tipleri.
 */

export interface HistoryCandle {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoryResponse {
  symbol: string;
  candles: HistoryCandle[];
  startUnix: number;
  endUnix: number;
  source: "yahoo";
  note?: string;
}

export type PositionSide = "long" | "short";
export type PositionStatus = "open" | "closed";

export interface SimPosition {
  id: string;
  side: PositionSide;
  status: PositionStatus;
  entryBarIdx: number;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;

  // Kapatıldıysa
  exitBarIdx?: number;
  exitPrice?: number;
  exitReason?: "manual" | "stop_loss" | "take_profit";
  netPnl?: number;
  pnlPct?: number;
}

export interface SimSettings {
  symbol: string;
  startDate: string; // ISO
  initialCapital: number;
  commissionPct: number; // %0.2 = 0.002
  speedMs: number; // auto-play hızı (varsayılan 1000)
}

export interface SimState {
  candles: HistoryCandle[];
  currentBarIdx: number;
  positions: SimPosition[];
  capital: number;
  initialCapital: number;
  notes: string; // işlem planı / not
  isPlaying: boolean;
  isFinished: boolean;
}

export const COMMISSION_DEFAULT = 0.002; // %0.2 (her bacak)
export const BSMV_RATE = 0.05;

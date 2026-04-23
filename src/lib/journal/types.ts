/**
 * Trade Journal tipleri — localStorage tabanlı.
 * Sonradan Supabase'e taşımak kolay olsun diye saf data model.
 */

export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface TradeEntry {
  id: string;
  symbol: string;              // örn. "THYAO", "ASELS"
  side: TradeSide;
  status: TradeStatus;

  // Alım
  entryPrice: number;
  quantity: number;
  entryDate: string;           // ISO

  // Çıkış
  exitPrice?: number;
  exitDate?: string;

  // Plan (disiplin skoru için)
  plannedStopLoss?: number;
  plannedTakeProfit?: number;

  // Komisyon oranı (örn. 0.002 = %0.2)
  commissionRate: number;

  note?: string;
  reasons?: TradeReason[];
}

export type TradeReason =
  | "fomo"               // FOMO ile aldım
  | "tip"                // Birinden duydum / guru tavsiyesi
  | "analysis"           // Kendi analizim
  | "news"               // Habere göre
  | "technical"          // Teknik kurulum
  | "panic_sell"         // Panikten sattım
  | "stop_loss_hit"      // Stop-loss vurdu
  | "take_profit_hit"    // Target'a vardı
  | "ignored_stop_loss"  // Stop'a uymadım
  | "revenge_trade";     // Zarar sonrası intikam

export interface TradeResult {
  grossPnl: number;
  commissionCost: number;
  bsmvCost: number;
  netPnl: number;
  netPnlPct: number;
}

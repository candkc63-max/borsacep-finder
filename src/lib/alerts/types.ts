/**
 * Alarm tipleri.
 *
 * 3 temel alarm:
 * - fomo: referans fiyattan %X yukarı uçtu
 * - stop_loss: fiyat stop seviyesine düştü (long) / yükseldi (short)
 * - take_profit: fiyat target seviyesine ulaştı
 *
 * Ek olarak manuel: price_above / price_below
 */

export type AlertKind = "fomo" | "stop_loss" | "take_profit" | "price_above" | "price_below";

export interface AlertRule {
  id: string;
  kind: AlertKind;
  symbol: string;
  side?: "long" | "short";

  /** Mutlak fiyat eşiği */
  threshold?: number;

  /** Yüzde eşiği (fomo) */
  pctThreshold?: number;

  /** Referans fiyat (fomo için alım/baz fiyatı) */
  referencePrice?: number;

  note?: string;
  createdAt: string;
  status: "armed" | "triggered" | "disabled";
  triggeredAt?: string;
  triggeredPrice?: number;

  /** Journal trade ile bağlantı (auto-generated alarmlar) */
  linkedTradeId?: string;
}

export interface AlertEvaluation {
  triggered: boolean;
  reason?: string;
  currentPrice: number;
}

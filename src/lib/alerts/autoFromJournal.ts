import { useEffect } from "react";
import { useTradeJournal } from "@/lib/journal/storage";
import { useAlerts } from "./storage";

/**
 * Journal'da AÇIK olan her işlem için stop/target alarmı otomatik oluşturur.
 * Aynı trade+kind için dedup (storage.addAlert içinde).
 * Kapanmış/silinmiş işlemlere bağlı armed alarmları disable eder.
 */
export function useAutoAlertsFromJournal() {
  const { trades } = useTradeJournal();
  const { alerts, addAlert, updateAlert } = useAlerts();

  useEffect(() => {
    for (const t of trades) {
      if (t.status !== "open") continue;

      if (t.plannedStopLoss !== undefined) {
        addAlert({
          kind: "stop_loss",
          symbol: t.symbol,
          side: t.side,
          threshold: t.plannedStopLoss,
          referencePrice: t.entryPrice,
          linkedTradeId: t.id,
          note: `${t.symbol} stop-loss (${t.plannedStopLoss})`,
        });
      }

      if (t.plannedTakeProfit !== undefined) {
        addAlert({
          kind: "take_profit",
          symbol: t.symbol,
          side: t.side,
          threshold: t.plannedTakeProfit,
          referencePrice: t.entryPrice,
          linkedTradeId: t.id,
          note: `${t.symbol} kar al (${t.plannedTakeProfit})`,
        });
      }
    }

    // Kapanmış/silinmiş trade'lere bağlı armed alarmları disable et
    const openIds = new Set(trades.filter((t) => t.status === "open").map((t) => t.id));
    for (const a of alerts) {
      if (!a.linkedTradeId || a.status !== "armed") continue;
      if (!openIds.has(a.linkedTradeId)) {
        updateAlert(a.id, { status: "disabled" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);
}

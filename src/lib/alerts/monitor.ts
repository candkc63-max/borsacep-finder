import { useCallback, useEffect, useRef } from "react";
import type { Stock } from "@/lib/stockData";
import { evaluateAlert } from "./engine";
import { useAlerts } from "./storage";
import type { AlertRule } from "./types";

export interface TriggeredAlert {
  alert: AlertRule;
  price: number;
  reason: string;
  triggeredAt: number;
}

/**
 * Alert monitor — stockData her değiştiğinde armed alarmları değerlendirir.
 *
 * Borsacep zaten useBistStocks ile 60 saniyede fiyat güncelliyor,
 * ekstra polling gerekmez. Sadece subscribe oluyoruz.
 */
export function useAlertMonitor(
  stockData: Stock[],
  onTrigger: (t: TriggeredAlert) => void,
) {
  const { alerts, updateAlert } = useAlerts();
  const triggerRef = useRef(onTrigger);
  const alertsRef = useRef(alerts);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    triggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // stockData değiştiğinde değerlendir
  useEffect(() => {
    if (!stockData || stockData.length === 0) return;

    const priceMap = new Map<string, number>();
    for (const s of stockData) {
      const last = s.prices[0];
      if (typeof last === "number") priceMap.set(s.symbol.toUpperCase(), last);
    }

    for (const a of alertsRef.current) {
      if (a.status !== "armed") continue;
      if (firedRef.current.has(a.id)) continue;
      const price = priceMap.get(a.symbol.toUpperCase());
      if (price === undefined) continue;

      const ev = evaluateAlert(a, price);
      if (ev.triggered) {
        firedRef.current.add(a.id);
        updateAlert(a.id, {
          status: "triggered",
          triggeredAt: new Date().toISOString(),
          triggeredPrice: price,
        });
        triggerRef.current({
          alert: a,
          price,
          reason: ev.reason ?? "Alarm tetiklendi",
          triggeredAt: Date.now(),
        });
      }
    }
  }, [stockData, updateAlert]);

  const armedCount = alerts.filter((a) => a.status === "armed").length;

  /** Manuel tetikleme (test için simülatör) */
  const simulateTick = useCallback(
    (symbol: string, price: number) => {
      for (const a of alertsRef.current) {
        if (a.status !== "armed") continue;
        if (a.symbol.toUpperCase() !== symbol.toUpperCase()) continue;
        const ev = evaluateAlert(a, price);
        if (ev.triggered) {
          firedRef.current.add(a.id);
          updateAlert(a.id, {
            status: "triggered",
            triggeredAt: new Date().toISOString(),
            triggeredPrice: price,
          });
          triggerRef.current({
            alert: a,
            price,
            reason: ev.reason ?? "Alarm tetiklendi (simüle)",
            triggeredAt: Date.now(),
          });
        }
      }
    },
    [updateAlert],
  );

  return { armedCount, simulateTick };
}

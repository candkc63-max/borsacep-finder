import type { CoachScenario } from "@/lib/coach/types";
import type { AlertEvaluation, AlertRule } from "./types";

/**
 * Tek bir alarmı mevcut fiyatla karşılaştırır. Saf fonksiyon.
 */
export function evaluateAlert(alert: AlertRule, currentPrice: number): AlertEvaluation {
  if (alert.status !== "armed") {
    return { triggered: false, currentPrice };
  }

  switch (alert.kind) {
    case "fomo": {
      if (alert.referencePrice === undefined || alert.pctThreshold === undefined) {
        return { triggered: false, currentPrice };
      }
      const pct = ((currentPrice - alert.referencePrice) / alert.referencePrice) * 100;
      if (pct >= alert.pctThreshold) {
        return {
          triggered: true,
          currentPrice,
          reason: `${alert.symbol} referansından %${pct.toFixed(1)} uçtu (eşik: %${alert.pctThreshold})`,
        };
      }
      return { triggered: false, currentPrice };
    }

    case "stop_loss": {
      if (alert.threshold === undefined) return { triggered: false, currentPrice };
      const hit =
        alert.side === "short"
          ? currentPrice >= alert.threshold
          : currentPrice <= alert.threshold;
      if (hit) {
        return {
          triggered: true,
          currentPrice,
          reason: `${alert.symbol} stop seviyesine değdi (${alert.threshold} → şu an ${currentPrice})`,
        };
      }
      return { triggered: false, currentPrice };
    }

    case "take_profit": {
      if (alert.threshold === undefined) return { triggered: false, currentPrice };
      const hit =
        alert.side === "short"
          ? currentPrice <= alert.threshold
          : currentPrice >= alert.threshold;
      if (hit) {
        return {
          triggered: true,
          currentPrice,
          reason: `${alert.symbol} kar al hedefine vardı (${alert.threshold} → şu an ${currentPrice})`,
        };
      }
      return { triggered: false, currentPrice };
    }

    case "price_above": {
      if (alert.threshold === undefined) return { triggered: false, currentPrice };
      if (currentPrice >= alert.threshold) {
        return {
          triggered: true,
          currentPrice,
          reason: `${alert.symbol} ${alert.threshold}'ı yukarı geçti (${currentPrice})`,
        };
      }
      return { triggered: false, currentPrice };
    }

    case "price_below": {
      if (alert.threshold === undefined) return { triggered: false, currentPrice };
      if (currentPrice <= alert.threshold) {
        return {
          triggered: true,
          currentPrice,
          reason: `${alert.symbol} ${alert.threshold}'ın altına düştü (${currentPrice})`,
        };
      }
      return { triggered: false, currentPrice };
    }

    default:
      return { triggered: false, currentPrice };
  }
}

/**
 * Tetiklenen alarm türü → Koç senaryo eşlemesi.
 */
export function coachScenarioForAlert(alert: AlertRule): CoachScenario {
  switch (alert.kind) {
    case "fomo":
      return "fomo";
    case "stop_loss":
      return "stop_loss_miss";
    case "take_profit":
      return "realistic_expectation";
    default:
      return "chat";
  }
}

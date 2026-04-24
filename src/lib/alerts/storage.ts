import { useCallback, useEffect, useState } from "react";
import type { AlertRule } from "./types";

const STORAGE_KEY = "borsacep-alerts-v1";

function readAll(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(alerts: AlertRule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new Event("alerts:changed"));
}

function generateId(): string {
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);

  const reload = useCallback(() => setAlerts(readAll()), []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("storage", h);
    window.addEventListener("alerts:changed", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("alerts:changed", h);
    };
  }, [reload]);

  const addAlert = useCallback(
    (rule: Omit<AlertRule, "id" | "createdAt" | "status">): AlertRule => {
      const all = readAll();
      // Dedup: same symbol+kind+linkedTradeId → return existing armed
      if (rule.linkedTradeId) {
        const dup = all.find(
          (a) =>
            a.linkedTradeId === rule.linkedTradeId &&
            a.kind === rule.kind &&
            a.status !== "disabled",
        );
        if (dup) return dup;
      }
      const entry: AlertRule = {
        ...rule,
        id: generateId(),
        createdAt: new Date().toISOString(),
        status: "armed",
      };
      writeAll([entry, ...all]);
      return entry;
    },
    [],
  );

  const updateAlert = useCallback((id: string, patch: Partial<AlertRule>) => {
    writeAll(readAll().map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const deleteAlert = useCallback((id: string) => {
    writeAll(readAll().filter((a) => a.id !== id));
  }, []);

  const disableAlert = useCallback(
    (id: string) => {
      updateAlert(id, { status: "disabled" });
    },
    [updateAlert],
  );

  const rearmAlert = useCallback(
    (id: string) => {
      updateAlert(id, {
        status: "armed",
        triggeredAt: undefined,
        triggeredPrice: undefined,
      });
    },
    [updateAlert],
  );

  return { alerts, addAlert, updateAlert, deleteAlert, disableAlert, rearmAlert };
}

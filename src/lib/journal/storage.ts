import { useCallback, useEffect, useState } from "react";
import type { TradeEntry } from "./types";

const STORAGE_KEY = "borsacep-journal-v1";

function readAll(): TradeEntry[] {
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

function writeAll(trades: TradeEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  window.dispatchEvent(new Event("journal:changed"));
}

function generateId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useTradeJournal() {
  const [trades, setTrades] = useState<TradeEntry[]>([]);

  const reload = useCallback(() => setTrades(readAll()), []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("storage", handler);
    window.addEventListener("journal:changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("journal:changed", handler);
    };
  }, [reload]);

  const addTrade = useCallback((trade: Omit<TradeEntry, "id">) => {
    const entry: TradeEntry = { ...trade, id: generateId() };
    writeAll([entry, ...readAll()]);
  }, []);

  const updateTrade = useCallback((id: string, patch: Partial<TradeEntry>) => {
    writeAll(readAll().map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    writeAll(readAll().filter((t) => t.id !== id));
  }, []);

  return { trades, addTrade, updateTrade, deleteTrade };
}

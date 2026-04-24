import { useCallback, useEffect, useState } from "react";

/**
 * #14 Stres Modu
 *
 * Kullan\u0131c\u0131 g\u00fcn\u00fcnde portf\u00f6y sayfas\u0131n\u0131 ya da hisse detay\u0131n\u0131 ka\u00e7 kez
 * a\u00e7\u0131yor onu sayar. E\u015fi\u011fi ge\u00e7erse "stress lock" devreye girer:
 * yeni al\u0131m/i\u015flem kayd\u0131 yapmaya kalk\u0131nca Ko\u00e7 "dostum nefes al" modu \u00e7\u0131kar.
 *
 * Sadece localStorage; gün sonu reset otomatik.
 */

const STORAGE_KEY = "borsacep-stress-counter-v1";
const DEFAULT_LIMIT = 10; // günlük check üstü
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 dakika

interface StressState {
  date: string; // YYYY-MM-DD
  checks: number;
  lockedUntil: number | null;
  dismissedToday: boolean;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function read(): StressState {
  if (typeof window === "undefined") {
    return { date: todayKey(), checks: 0, lockedUntil: null, dismissedToday: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), checks: 0, lockedUntil: null, dismissedToday: false };
    const parsed = JSON.parse(raw) as StressState;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), checks: 0, lockedUntil: null, dismissedToday: false };
    }
    return parsed;
  } catch {
    return { date: todayKey(), checks: 0, lockedUntil: null, dismissedToday: false };
  }
}

function write(state: StressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("stress:changed"));
}

export interface StressSnapshot {
  checks: number;
  limit: number;
  isLocked: boolean;
  showWarning: boolean;
  dismissToday: () => void;
  recordCheck: () => void;
  overrideLock: () => void;
}

export function useStressMonitor(limit: number = DEFAULT_LIMIT): StressSnapshot {
  const [state, setState] = useState<StressState>(() => read());

  useEffect(() => {
    const h = () => setState(read());
    window.addEventListener("storage", h);
    window.addEventListener("stress:changed", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("stress:changed", h);
    };
  }, []);

  const recordCheck = useCallback(() => {
    const current = read();
    const next: StressState = {
      ...current,
      date: todayKey(),
      checks: current.checks + 1,
    };
    if (next.checks > limit && !next.lockedUntil) {
      next.lockedUntil = Date.now() + LOCK_DURATION_MS;
    }
    write(next);
  }, [limit]);

  const dismissToday = useCallback(() => {
    const current = read();
    write({ ...current, dismissedToday: true });
  }, []);

  const overrideLock = useCallback(() => {
    const current = read();
    write({ ...current, lockedUntil: null });
  }, []);

  const now = Date.now();
  const isLocked = !!(state.lockedUntil && state.lockedUntil > now);
  const showWarning = state.checks >= limit && !state.dismissedToday && !isLocked;

  return {
    checks: state.checks,
    limit,
    isLocked,
    showWarning,
    dismissToday,
    recordCheck,
    overrideLock,
  };
}

import type { Condition, Join } from "./strategyRules";

export const STRATEGY_STORAGE_KEY = "borsa101-strategies";

export type SavedStrategy = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  direction: "long";
  buyJoin: Join;
  sellJoin: Join;
  buy: Condition[];
  sell: Condition[];
  capital: number;
  allocation: number;
  fee: number;
  slippage: number;
};

type Memory = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function join(value: unknown): Join | null {
  return value === "and" || value === "or" ? value : null;
}

function condition(value: unknown): Condition | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (row.kind === "ema-cross" && (row.direction === "up" || row.direction === "down") && typeof row.fast === "number" && typeof row.slow === "number") {
    return { id: row.id, kind: "ema-cross", fast: row.fast, slow: row.slow, direction: row.direction };
  }
  if (row.kind === "price-ema" && (row.direction === "above" || row.direction === "below" || row.direction === "cross-up" || row.direction === "cross-down") && typeof row.period === "number") {
    return { id: row.id, kind: "price-ema", period: row.period, direction: row.direction };
  }
  if (row.kind === "rsi-cross" && (row.direction === "up" || row.direction === "down") && typeof row.period === "number" && typeof row.level === "number") {
    return { id: row.id, kind: "rsi-cross", period: row.period, level: row.level, direction: row.direction };
  }
  if ((row.kind === "adx-level" || row.kind === "atr-level") && (row.relation === "above" || row.relation === "below") && typeof row.period === "number" && typeof row.level === "number") {
    return { id: row.id, kind: row.kind, period: row.period, level: row.level, relation: row.relation };
  }
  return null;
}

function saved(value: unknown): SavedStrategy | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const buyJoin = join(row.buyJoin);
  const sellJoin = join(row.sellJoin);
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.createdAt !== "string" || typeof row.updatedAt !== "string") return null;
  if (row.direction !== "long" || !buyJoin || !sellJoin || !Array.isArray(row.buy) || !Array.isArray(row.sell)) return null;
  if (typeof row.capital !== "number" || typeof row.allocation !== "number" || typeof row.fee !== "number" || typeof row.slippage !== "number") return null;
  const buy = row.buy.map(condition);
  const sell = row.sell.map(condition);
  if (buy.some((item) => item == null) || sell.some((item) => item == null)) return null;
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    direction: "long",
    buyJoin,
    sellJoin,
    buy: buy as Condition[],
    sell: sell as Condition[],
    capital: row.capital,
    allocation: row.allocation,
    fee: row.fee,
    slippage: row.slippage,
  };
}

export function parseStrategies(raw: string | null): SavedStrategy[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(saved).filter((item): item is SavedStrategy => item != null);
  } catch {
    return [];
  }
}

export function serializeStrategies(list: SavedStrategy[]): string {
  return JSON.stringify(list);
}

export function loadStrategies(storage: Memory): SavedStrategy[] {
  return parseStrategies(storage.getItem(STRATEGY_STORAGE_KEY));
}

export function saveStrategies(storage: Memory, list: SavedStrategy[]) {
  storage.setItem(STRATEGY_STORAGE_KEY, serializeStrategies(list));
}

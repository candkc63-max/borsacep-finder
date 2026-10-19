import type { CompareOp, Condition, ConditionGroup, Join, LineSpec, Operand } from "./strategyRules";

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
  buyGroups?: ConditionGroup[];
  sellGroups?: ConditionGroup[];
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

const LINE_NAMES = new Set(["sma", "ema", "wma", "hma", "rsi", "adx", "atr", "cci", "roc", "obv", "vwap", "macd", "stoch", "bb", "keltner", "donchian", "supertrend"]);
const COMPARE_OPS = new Set(["above", "below", "gt", "lt", "cross-up", "cross-down", "break-prev-high", "break-prev-low", "break-highest", "break-lowest"]);

function lineSpec(value: unknown): LineSpec | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !LINE_NAMES.has(row.name)) return null;
  const numbers = ["period", "fast", "slow", "signal", "mult", "atrPeriod", "smooth"] as const;
  if (numbers.some((key) => typeof row[key] !== "number")) return null;
  if (typeof row.line !== "string") return null;
  return {
    name: row.name as LineSpec["name"],
    period: row.period as number,
    fast: row.fast as number,
    slow: row.slow as number,
    signal: row.signal as number,
    mult: row.mult as number,
    atrPeriod: row.atrPeriod as number,
    smooth: row.smooth as number,
    line: row.line,
  };
}

function operand(value: unknown): Operand | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.source === "price" && (row.field === "open" || row.field === "high" || row.field === "low" || row.field === "close")) {
    return { source: "price", field: row.field };
  }
  if (row.source === "constant" && typeof row.value === "number") return { source: "constant", value: row.value };
  if (row.source === "indicator") {
    const spec = lineSpec(row.spec);
    return spec ? { source: "indicator", spec } : null;
  }
  return null;
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
  if (row.kind === "compare" && typeof row.op === "string" && COMPARE_OPS.has(row.op) && typeof row.length === "number") {
    const left = operand(row.left);
    const right = operand(row.right);
    if (!left || !right) return null;
    return { id: row.id, kind: "compare", left, op: row.op as CompareOp, right, length: row.length };
  }
  return null;
}

function group(value: unknown): ConditionGroup | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const joinMode = join(row.join);
  if (typeof row.id !== "string" || !row.id || !joinMode || !Array.isArray(row.conditions)) return null;
  const conditions = row.conditions.map(condition);
  if (conditions.some((item) => item == null)) return null;
  return { id: row.id, join: joinMode, conditions: conditions as Condition[] };
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
  const buyGroups = parseGroups(row.buyGroups);
  const sellGroups = parseGroups(row.sellGroups);
  if (buyGroups === null || sellGroups === null) return null;
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
    ...(buyGroups ? { buyGroups } : {}),
    ...(sellGroups ? { sellGroups } : {}),
    capital: row.capital,
    allocation: row.allocation,
    fee: row.fee,
    slippage: row.slippage,
  };
}

function parseGroups(value: unknown): ConditionGroup[] | undefined | null {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;
  const groups = value.map(group);
  if (groups.some((item) => item == null)) return null;
  return groups as ConditionGroup[];
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

import { COLUMNS, TABS, type Operator, type Rule, type TabId, type Universe } from "@/screener/model";
import { fieldById } from "@/screener/model";
import type { ScreenInterval, TechnicalSnapshot } from "@/screener/snapshot";

export const SCREEN_KEY = "borsa101-screener";
export const WATCH_KEY = "borsa101-watchlist";
export const FAV_KEY = "borsa101-favorites";
const TECH_KEY = "borsa101-tech-v1";

export type SavedScreen = {
  id: string;
  name: string;
  rules: Rule[];
  columns: string[] | null;
  sortKey: string;
  sortDesc: boolean;
  tab: TabId;
  universe: Universe;
  interval: ScreenInterval;
};

const INTERVALS = new Set<ScreenInterval>(["1d", "1wk", "4h", "1h"]);
const UNIVERSES = new Set<Universe>(["all", "bist100", "bist50", "watch"]);
const TABS_SET = new Set<TabId>(TABS.map((tab) => tab.id));
const COLUMN_IDS = new Set(COLUMNS.map((column) => column.id));

function cleanRule(value: unknown, index: number): Rule | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Rule>;
  if (typeof raw.field !== "string" || !fieldById(raw.field)) return null;
  const field = fieldById(raw.field)!;
  if (typeof raw.op !== "string" || !field.ops.includes(raw.op as Operator)) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `k-${index}`,
    field: raw.field,
    op: raw.op as Operator,
    value: typeof raw.value === "string" ? raw.value : "",
    valueTo: typeof raw.valueTo === "string" ? raw.valueTo : "",
  };
}

export function parseScreens(raw: string | null): SavedScreen[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const screens: SavedScreen[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<SavedScreen>;
    if (typeof record.id !== "string" || typeof record.name !== "string" || !record.name.trim()) continue;
    if (!Array.isArray(record.rules)) continue;
    const rules = record.rules.map((rule, index) => cleanRule(rule, index)).filter((rule): rule is Rule => rule != null);
    const columns = Array.isArray(record.columns)
      ? record.columns.filter((id): id is string => typeof id === "string" && COLUMN_IDS.has(id))
      : null;
    const tab = TABS_SET.has(record.tab as TabId) ? record.tab as TabId : "overview";
    const universe = UNIVERSES.has(record.universe as Universe) ? record.universe as Universe : "all";
    const interval = INTERVALS.has(record.interval as ScreenInterval) ? record.interval as ScreenInterval : "1d";
    screens.push({
      id: record.id,
      name: record.name.trim(),
      rules,
      columns: columns && columns.length ? columns : null,
      sortKey: typeof record.sortKey === "string" && (COLUMN_IDS.has(record.sortKey) || record.sortKey === "marketCap") ? record.sortKey : "marketCap",
      sortDesc: record.sortDesc !== false,
      tab,
      universe,
      interval,
    });
  }
  return screens;
}

export function loadScreens(storage: Storage = localStorage): SavedScreen[] {
  try {
    return parseScreens(storage.getItem(SCREEN_KEY));
  } catch {
    return [];
  }
}

export function writeScreens(screens: SavedScreen[], storage: Storage = localStorage) {
  storage.setItem(SCREEN_KEY, JSON.stringify(screens));
}

export function loadTickers(key: string, storage: Storage = localStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function writeTickers(key: string, tickers: string[], storage: Storage = localStorage) {
  storage.setItem(key, JSON.stringify(tickers));
}

export function toggleTicker(list: string[], ticker: string) {
  return list.includes(ticker) ? list.filter((item) => item !== ticker) : [...list, ticker];
}

type TechCache = Record<string, { at: number; rows: Record<string, TechnicalSnapshot | null> }>;

export function readTechCache(interval: ScreenInterval, storage: Storage = sessionStorage, now = Date.now()): Record<string, TechnicalSnapshot | null> {
  try {
    const parsed = JSON.parse(storage.getItem(TECH_KEY) ?? "{}") as TechCache;
    const entry = parsed[interval];
    if (!entry || now - entry.at > 6 * 60 * 60 * 1000) return {};
    return entry.rows ?? {};
  } catch {
    return {};
  }
}

export function writeTechCache(interval: ScreenInterval, rows: Record<string, TechnicalSnapshot | null>, storage: Storage = sessionStorage, now = Date.now()) {
  let parsed: TechCache = {};
  try {
    parsed = JSON.parse(storage.getItem(TECH_KEY) ?? "{}") as TechCache;
  } catch {
    parsed = {};
  }
  parsed[interval] = { at: now, rows };
  storage.setItem(TECH_KEY, JSON.stringify(parsed));
}

import type { Stock } from "@/data/stocks";
import { missingLabels, type DataStatus } from "@/screener/coverage";
import { indexesFor, type MembershipBook } from "@/screener/membership";
import { brokePriorHigh, brokeRecord, type TechnicalSnapshot } from "@/screener/snapshot";

export type Operator = "gt" | "lt" | "eq" | "gte" | "lte" | "between" | "above" | "below" | "cross-up" | "cross-down" | "near" | "breaks";

export type FieldKind = "number" | "flag" | "cross" | "near" | "break" | "category";

export type FieldDef = {
  id: string;
  label: string;
  group: "Fiyat" | "Teknik" | "Olay" | "Temel" | "Kategori";
  primary: boolean;
  kind: FieldKind;
  ops: Operator[];
};

const NUMBER_OPS: Operator[] = ["gt", "lt", "eq", "gte", "lte", "between"];
const FLAG_OPS: Operator[] = ["above", "below"];
const CROSS_OPS: Operator[] = ["above", "below", "cross-up", "cross-down"];
const NEAR_OPS: Operator[] = ["near", "gt", "lt", "gte", "lte", "between"];
const BREAK_OPS: Operator[] = ["breaks"];
const CATEGORY_OPS: Operator[] = ["eq"];

export const OPERATORS: { id: Operator; label: string }[] = [
  { id: "gt", label: ">" },
  { id: "lt", label: "<" },
  { id: "eq", label: "=" },
  { id: "gte", label: ">=" },
  { id: "lte", label: "<=" },
  { id: "between", label: "arasında" },
  { id: "above", label: "üstünde" },
  { id: "below", label: "altında" },
  { id: "cross-up", label: "yukarı kesiyor" },
  { id: "cross-down", label: "aşağı kesiyor" },
  { id: "near", label: "yakınında" },
  { id: "breaks", label: "kırıyor" },
];

function field(item: FieldDef): FieldDef {
  return item;
}

export const FIELDS: FieldDef[] = [
  field({ id: "price", label: "Son fiyat", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "changeDay", label: "Günlük değişim %", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "volume", label: "Hacim", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "averageVolume", label: "Ortalama hacim", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "relativeVolume", label: "Göreceli hacim", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "marketCap", label: "Piyasa değeri", group: "Fiyat", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "barChange", label: "Dönem değişim %", group: "Fiyat", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "ema20", label: "EMA 20", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "ema50", label: "EMA 50", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "ema100", label: "EMA 100", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "ema200", label: "EMA 200", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "sma20", label: "SMA 20", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "sma50", label: "SMA 50", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "sma200", label: "SMA 200", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "rsi", label: "RSI", group: "Teknik", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "macd", label: "MACD", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "adx", label: "ADX", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "atr", label: "ATR", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "stochK", label: "Stochastic", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "bbPercent", label: "Bollinger %b", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "supertrend", label: "Supertrend", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "donchianUpper", label: "Donchian üst", group: "Teknik", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "priceEma20", label: "Fiyat EMA 20", group: "Olay", primary: false, kind: "cross", ops: CROSS_OPS }),
  field({ id: "priceEma200", label: "Fiyat EMA 200", group: "Olay", primary: false, kind: "cross", ops: CROSS_OPS }),
  field({ id: "ema20Ema50", label: "EMA 20 / EMA 50", group: "Olay", primary: false, kind: "cross", ops: CROSS_OPS }),
  field({ id: "macdSignal", label: "MACD / sinyal", group: "Olay", primary: false, kind: "cross", ops: CROSS_OPS }),
  field({ id: "emaBullStack", label: "EMA 20 > EMA 50 > EMA 200", group: "Olay", primary: false, kind: "flag", ops: FLAG_OPS }),
  field({ id: "rsiAbove50", label: "RSI 50 üstünde", group: "Olay", primary: false, kind: "flag", ops: FLAG_OPS }),
  field({ id: "adxAbove25", label: "ADX 25 üstünde", group: "Olay", primary: false, kind: "flag", ops: FLAG_OPS }),
  field({ id: "supertrendUp", label: "Supertrend yönü", group: "Olay", primary: false, kind: "flag", ops: FLAG_OPS }),
  field({ id: "declineAboveSupport", label: "Düşüşte destek üstü", group: "Olay", primary: false, kind: "flag", ops: FLAG_OPS }),
  field({ id: "recordBreak", label: "Tarihi zirve", group: "Olay", primary: false, kind: "break", ops: BREAK_OPS }),
  field({ id: "breakout", label: "Breakout", group: "Olay", primary: false, kind: "break", ops: BREAK_OPS }),
  field({ id: "week52Distance", label: "52h zirveye uzaklık %", group: "Olay", primary: false, kind: "near", ops: NEAR_OPS }),
  field({ id: "pe", label: "FK", group: "Temel", primary: true, kind: "number", ops: NUMBER_OPS }),
  field({ id: "pb", label: "PD/DD", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "earningsGrowth", label: "Net kâr büyümesi", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "revenueGrowth", label: "Satış büyümesi", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "roe", label: "Özsermaye kârlılığı", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "dividendYield", label: "Temettü verimi", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "eps", label: "EPS", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "change1y", label: "1 yıl değişim %", group: "Temel", primary: false, kind: "number", ops: NUMBER_OPS }),
  field({ id: "sector", label: "Sektör", group: "Kategori", primary: true, kind: "category", ops: CATEGORY_OPS }),
  field({ id: "index", label: "Endeks üyeliği", group: "Kategori", primary: false, kind: "category", ops: CATEGORY_OPS }),
  field({ id: "market", label: "Pazar türü", group: "Kategori", primary: false, kind: "category", ops: CATEGORY_OPS }),
];

const FIELD_MAP = new Map(FIELDS.map((item) => [item.id, item]));

export function fieldById(id: string): FieldDef | null {
  return FIELD_MAP.get(id) ?? null;
}

export function operatorLabel(id: Operator) {
  return OPERATORS.find((item) => item.id === id)?.label ?? id;
}

export type Rule = {
  id: string;
  field: string;
  op: Operator;
  value: string;
  valueTo: string;
};

export type Universe = "all" | "bist100" | "bist50" | "watch";
export type TabId = "overview" | "performance" | "technical" | "valuation" | "dividend" | "profit";

export type ScreenerRow = {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  dividendYield: number | null;
  change1y: number | null;
  changeDay: number | null;
  volume: number | null;
  averageVolume: number | null;
  relativeVolume: number | null;
  eps: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  week52Distance: number | null;
  indexes: string[];
  market: string | null;
  technical: TechnicalSnapshot | null;
  dataStatus: DataStatus;
  dataSource: string;
  dataAsOf: string | null;
  missing: string[];
};

export function toScreenerRow(stock: Stock, technical: TechnicalSnapshot | null = null, book: MembershipBook | null = null): ScreenerRow {
  const dataStatus = stock.dataStatus ?? "sample";
  const missingQuote = dataStatus === "missing";
  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    price: missingQuote ? 0 : stock.price,
    marketCap: missingQuote ? 0 : stock.marketCap,
    pe: missingQuote ? null : stock.pe,
    pb: missingQuote ? null : stock.pb,
    roe: missingQuote ? null : stock.roe,
    dividendYield: missingQuote ? null : stock.dividendYield,
    change1y: missingQuote ? null : stock.change1y,
    changeDay: missingQuote ? null : numberOrNull(stock.changeDay),
    volume: missingQuote ? null : numberOrNull(stock.volume),
    averageVolume: missingQuote ? null : numberOrNull(stock.averageVolume),
    relativeVolume: missingQuote ? null : technical?.relativeVolume ?? numberOrNull(stock.relativeVolume),
    eps: missingQuote ? null : numberOrNull(stock.eps),
    earningsGrowth: missingQuote ? null : numberOrNull(stock.earningsGrowth),
    revenueGrowth: missingQuote ? null : numberOrNull(stock.revenueGrowth),
    week52Distance: missingQuote ? null : technical?.week52Distance ?? numberOrNull(stock.week52Distance),
    indexes: indexesFor(stock.ticker, book),
    market: null,
    technical: missingQuote ? null : technical,
    dataStatus,
    dataSource: stock.dataSource ?? (dataStatus === "sample" ? "Örnek liste" : "Yahoo Finance"),
    dataAsOf: stock.dataAsOf ?? null,
    missing: missingLabels(stock, technical != null),
  };
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function techNumber(row: ScreenerRow, key: keyof TechnicalSnapshot): number | null {
  const value = row.technical?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function numberValue(row: ScreenerRow, id: string): number | null {
  if (row.dataStatus === "missing") return null;
  switch (id) {
    case "price": return row.price;
    case "changeDay": return row.changeDay;
    case "volume": return row.volume;
    case "averageVolume": return row.averageVolume;
    case "relativeVolume": return row.relativeVolume;
    case "marketCap": return row.marketCap;
    case "pe": return row.pe;
    case "pb": return row.pb;
    case "roe": return row.roe;
    case "dividendYield": return row.dividendYield;
    case "eps": return row.eps;
    case "earningsGrowth": return row.earningsGrowth;
    case "revenueGrowth": return row.revenueGrowth;
    case "change1y": return row.change1y;
    case "week52Distance": return row.week52Distance;
    case "barChange":
    case "ema20":
    case "ema50":
    case "ema100":
    case "ema200":
    case "sma20":
    case "sma50":
    case "sma200":
    case "rsi":
    case "macd":
    case "adx":
    case "atr":
    case "stochK":
    case "bbPercent":
    case "supertrend":
    case "donchianUpper":
      return techNumber(row, id);
    default:
      return null;
  }
}

function flagOf(row: ScreenerRow, id: string): boolean | null {
  const value = row.technical?.[id as keyof TechnicalSnapshot];
  return typeof value === "boolean" ? value : null;
}

function crossFlag(row: ScreenerRow, id: string, op: Operator): boolean | null {
  const tech = row.technical;
  if (!tech) return null;
  if (id === "priceEma20") {
    if (op === "cross-up") return tech.priceEma20CrossUp;
    if (op === "cross-down") return tech.priceEma20CrossDown;
    if (op === "below") return tech.priceEma20Above == null ? null : !tech.priceEma20Above;
    return tech.priceEma20Above;
  }
  if (id === "priceEma200") {
    if (op === "cross-up") return tech.priceEma200CrossUp;
    if (op === "cross-down") return tech.priceEma200CrossDown;
    if (op === "below") return tech.priceEma200Above == null ? null : !tech.priceEma200Above;
    return tech.priceEma200Above;
  }
  if (id === "ema20Ema50") {
    if (op === "cross-up") return tech.emaCrossUp;
    if (op === "cross-down") return tech.emaCrossDown;
    if (op === "below") return tech.ema20AboveEma50 == null ? null : !tech.ema20AboveEma50;
    return tech.ema20AboveEma50;
  }
  if (id === "macdSignal") {
    if (op === "cross-up") return tech.macdCrossUp;
    if (op === "cross-down") return tech.macdCrossDown;
    if (op === "below") return tech.macdAbove == null ? null : !tech.macdAbove;
    return tech.macdAbove;
  }
  return null;
}

export function ruleIsActive(rule: Rule): boolean {
  const field = fieldById(rule.field);
  if (!field || !field.ops.includes(rule.op)) return false;
  if (field.kind === "flag" || field.kind === "cross") return true;
  if (rule.op === "between") return parseNumber(rule.value) != null && parseNumber(rule.valueTo) != null;
  if (field.kind === "category") return rule.value.trim() !== "";
  return parseNumber(rule.value) != null;
}

function compare(actual: number | null, op: Operator, left: number | null, right: number | null): boolean {
  if (actual == null || left == null) return false;
  if (op === "gt") return actual > left;
  if (op === "lt") return actual < left;
  if (op === "gte") return actual >= left;
  if (op === "lte") return actual <= left;
  if (op === "eq") return Math.abs(actual - left) <= Math.max(1e-6, Math.abs(left) * 1e-9);
  if (op === "between") {
    if (right == null) return false;
    const low = Math.min(left, right);
    const high = Math.max(left, right);
    return actual >= low && actual <= high;
  }
  if (op === "near") return Math.abs(actual) <= left;
  return false;
}

export function matchRule(row: ScreenerRow, rule: Rule): boolean {
  if (!ruleIsActive(rule)) return true;
  const field = fieldById(rule.field);
  if (!field) return true;
  if (field.kind === "category") {
    if (field.id === "sector") return row.sector === rule.value;
    if (field.id === "index") return row.indexes.includes(rule.value);
    if (field.id === "market") return row.market === rule.value;
    return false;
  }
  if (field.kind === "flag") {
    const flag = flagOf(row, field.id);
    if (flag == null) return false;
    return rule.op === "below" ? flag === false : flag === true;
  }
  if (field.kind === "cross") {
    const flag = crossFlag(row, field.id, rule.op);
    return flag === true;
  }
  if (field.kind === "break") {
    if (!row.technical) return false;
    const window = parseNumber(rule.value);
    if (window == null) return true;
    const hit = field.id === "recordBreak"
      ? brokeRecord(row.technical.highs, row.technical.closes, window)
      : brokePriorHigh(row.technical.highs, row.technical.closes, window);
    return hit === true;
  }
  return compare(numberValue(row, field.id), rule.op, parseNumber(rule.value), parseNumber(rule.valueTo));
}

export function ruleNeedsBars(rule: Rule): boolean {
  const field = fieldById(rule.field);
  if (!field || !ruleIsActive(rule)) return false;
  if (field.id === "week52Distance") return false;
  return field.group === "Teknik" || field.group === "Olay" || field.id === "barChange";
}

export type ScreenQuery = {
  rules: Rule[];
  search: string;
  universe: Universe;
  watchlist: string[];
  sortKey: string;
  sortDesc: boolean;
};

function inUniverse(row: ScreenerRow, universe: Universe, watchlist: Set<string>) {
  if (universe === "bist100") return row.indexes.includes("BIST 100");
  if (universe === "bist50") return row.indexes.includes("BIST 50");
  if (universe === "watch") return watchlist.has(row.ticker);
  return true;
}

function sortValue(row: ScreenerRow, key: string): number | string | null {
  if (key === "ticker") return row.ticker;
  if (key === "name") return row.name;
  if (key === "sector") return row.sector;
  if (key === "index") return row.indexes.join(", ");
  if (key === "market") return row.market;
  if (key === "coverage") return row.dataStatus;
  return numberValue(row, key);
}

export function applyScreen(rows: ScreenerRow[], query: ScreenQuery): ScreenerRow[] {
  const words = query.search.trim().toLocaleLowerCase("tr");
  const watchlist = new Set(query.watchlist);
  const filtered = rows.filter((row) => {
    if (!inUniverse(row, query.universe, watchlist)) return false;
    if (words) {
      const haystack = `${row.ticker} ${row.name}`.toLocaleLowerCase("tr");
      if (!haystack.includes(words)) return false;
    }
    return query.rules.every((rule) => matchRule(row, rule));
  });
  filtered.sort((a, b) => {
    const av = sortValue(a, query.sortKey);
    const bv = sortValue(b, query.sortKey);
    if (typeof av === "string" || typeof bv === "string") {
      const left = typeof av === "string" ? av : "";
      const right = typeof bv === "string" ? bv : "";
      if (!left && !right) return a.ticker.localeCompare(b.ticker, "tr");
      if (!left) return 1;
      if (!right) return -1;
      const compared = left.localeCompare(right, "tr");
      if (compared === 0) return a.ticker.localeCompare(b.ticker, "tr");
      return compared * (query.sortDesc ? -1 : 1);
    }
    if (av == null && bv == null) return a.ticker.localeCompare(b.ticker, "tr");
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return a.ticker.localeCompare(b.ticker, "tr");
    return (av - bv) * (query.sortDesc ? -1 : 1);
  });
  return filtered;
}

export type ColumnDef = {
  id: string;
  label: string;
  align: "left" | "right";
  kind: "text" | "price" | "pct" | "percent" | "volume" | "cap" | "number" | "rel";
};

export const COLUMNS: ColumnDef[] = [
  { id: "ticker", label: "Sembol", align: "left", kind: "text" },
  { id: "name", label: "Şirket adı", align: "left", kind: "text" },
  { id: "price", label: "Son fiyat", align: "right", kind: "price" },
  { id: "changeDay", label: "Günlük değişim %", align: "right", kind: "pct" },
  { id: "volume", label: "Hacim", align: "right", kind: "volume" },
  { id: "relativeVolume", label: "Göreceli hacim", align: "right", kind: "rel" },
  { id: "marketCap", label: "Piyasa değeri", align: "right", kind: "cap" },
  { id: "pe", label: "FK", align: "right", kind: "number" },
  { id: "eps", label: "EPS", align: "right", kind: "number" },
  { id: "sector", label: "Sektör", align: "left", kind: "text" },
  { id: "barChange", label: "Dönem değişim %", align: "right", kind: "pct" },
  { id: "change1y", label: "1 yıl %", align: "right", kind: "pct" },
  { id: "week52Distance", label: "52h uzaklık %", align: "right", kind: "percent" },
  { id: "ema20", label: "EMA 20", align: "right", kind: "price" },
  { id: "ema50", label: "EMA 50", align: "right", kind: "price" },
  { id: "ema100", label: "EMA 100", align: "right", kind: "price" },
  { id: "ema200", label: "EMA 200", align: "right", kind: "price" },
  { id: "sma20", label: "SMA 20", align: "right", kind: "price" },
  { id: "sma50", label: "SMA 50", align: "right", kind: "price" },
  { id: "sma200", label: "SMA 200", align: "right", kind: "price" },
  { id: "rsi", label: "RSI", align: "right", kind: "number" },
  { id: "adx", label: "ADX", align: "right", kind: "number" },
  { id: "macd", label: "MACD", align: "right", kind: "number" },
  { id: "atr", label: "ATR", align: "right", kind: "number" },
  { id: "stochK", label: "Stochastic", align: "right", kind: "number" },
  { id: "bbPercent", label: "Bollinger %b", align: "right", kind: "number" },
  { id: "supertrend", label: "Supertrend", align: "right", kind: "price" },
  { id: "donchianUpper", label: "Donchian", align: "right", kind: "price" },
  { id: "pb", label: "PD/DD", align: "right", kind: "number" },
  { id: "dividendYield", label: "Temettü verimi", align: "right", kind: "percent" },
  { id: "earningsGrowth", label: "Net kâr büyümesi", align: "right", kind: "pct" },
  { id: "revenueGrowth", label: "Satış büyümesi", align: "right", kind: "pct" },
  { id: "roe", label: "Özsermaye kârlılığı", align: "right", kind: "percent" },
  { id: "averageVolume", label: "Ortalama hacim", align: "right", kind: "volume" },
  { id: "index", label: "Endeks", align: "left", kind: "text" },
  { id: "market", label: "Pazar türü", align: "left", kind: "text" },
  { id: "coverage", label: "Veri durumu", align: "left", kind: "text" },
];

const COLUMN_MAP = new Map(COLUMNS.map((column) => [column.id, column]));

export function columnById(id: string): ColumnDef | null {
  return COLUMN_MAP.get(id) ?? null;
}

export const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Genel Bakış" },
  { id: "performance", label: "Performans" },
  { id: "technical", label: "Teknikler" },
  { id: "valuation", label: "Değerleme" },
  { id: "dividend", label: "Temettüler" },
  { id: "profit", label: "Karlılık" },
];

export const TAB_COLUMNS: Record<TabId, string[]> = {
  overview: ["ticker", "name", "price", "changeDay", "volume", "relativeVolume", "marketCap", "pe", "eps", "sector", "index", "coverage"],
  performance: ["ticker", "name", "price", "changeDay", "barChange", "change1y", "week52Distance", "relativeVolume"],
  technical: ["ticker", "name", "price", "ema20", "ema50", "ema200", "rsi", "adx", "macd"],
  valuation: ["ticker", "name", "price", "marketCap", "pe", "pb", "eps"],
  dividend: ["ticker", "name", "price", "dividendYield", "eps"],
  profit: ["ticker", "name", "eps", "earningsGrowth", "revenueGrowth", "roe"],
};

export function visibleColumns(tab: TabId, custom: string[] | null): ColumnDef[] {
  const ids = custom?.length ? custom : TAB_COLUMNS[tab];
  const columns = ids.map((id) => columnById(id)).filter((column): column is ColumnDef => column != null);
  if (!columns.some((column) => column.id === "ticker")) {
    const ticker = columnById("ticker");
    if (ticker) columns.unshift(ticker);
  }
  if (!columns.some((column) => column.id === "coverage")) {
    const coverage = columnById("coverage");
    if (coverage) columns.push(coverage);
  }
  return columns;
}

export function pageOf<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;
  return { rows: rows.slice(start, start + size), page: current, pages, total: rows.length };
}

export function clampWidth(value: number) {
  if (!Number.isFinite(value)) return 110;
  return Math.min(360, Math.max(72, Math.round(value)));
}

export function categoryOptions(id: string, rows: ScreenerRow[]): string[] {
  if (id === "sector") return Array.from(new Set(rows.map((row) => row.sector))).sort((a, b) => a.localeCompare(b, "tr"));
  if (id === "index") return Array.from(new Set(rows.flatMap((row) => row.indexes))).sort((a, b) => a.localeCompare(b, "tr"));
  if (id === "market") return Array.from(new Set(rows.map((row) => row.market).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b, "tr"));
  return [];
}

function rule(field: string, op: Operator, value = "", valueTo = ""): Omit<Rule, "id"> {
  return { field, op, value, valueTo };
}

export const PRESETS: { id: string; name: string; rules: Omit<Rule, "id">[]; tab: TabId; sortKey: string; sortDesc: boolean }[] = [
  { id: "record", name: "Tarihi zirveyi kıran hisseler", tab: "technical", sortKey: "week52Distance", sortDesc: false, rules: [rule("recordBreak", "breaks", "20")] },
  { id: "near52", name: "52 haftalık zirveye yakın hisseler", tab: "performance", sortKey: "week52Distance", sortDesc: false, rules: [rule("week52Distance", "near", "3")] },
  { id: "rel", name: "Yüksek göreceli hacim", tab: "overview", sortKey: "relativeVolume", sortDesc: true, rules: [rule("relativeVolume", "gt", "2")] },
  { id: "ema", name: "EMA 20 > EMA 50 > EMA 200 olan hisseler", tab: "technical", sortKey: "rsi", sortDesc: true, rules: [rule("emaBullStack", "above")] },
  { id: "rsi", name: "RSI 50 üzeri ve ADX güçlü hisseler", tab: "technical", sortKey: "adx", sortDesc: true, rules: [rule("rsi", "gt", "50"), rule("adx", "gt", "25")] },
  { id: "support", name: "Düşüşte destek üstünde kalan hisseler", tab: "technical", sortKey: "price", sortDesc: true, rules: [rule("declineAboveSupport", "above")] },
  { id: "dividend", name: "Temettü hisseleri", tab: "dividend", sortKey: "dividendYield", sortDesc: true, rules: [rule("dividendYield", "gt", "2")] },
  { id: "profit", name: "Karlılığı güçlü hisseler", tab: "profit", sortKey: "roe", sortDesc: true, rules: [rule("roe", "gt", "20")] },
  { id: "value", name: "Düşük FK / güçlü büyüme", tab: "valuation", sortKey: "pe", sortDesc: false, rules: [rule("pe", "between", "0.1", "10"), rule("earningsGrowth", "gt", "15")] },
  { id: "breakout", name: "Hacimli breakout adayları", tab: "technical", sortKey: "relativeVolume", sortDesc: true, rules: [rule("relativeVolume", "gt", "1.5"), rule("breakout", "breaks", "20")] },
];

export function presetRules(presetId: string): Rule[] {
  const preset = PRESETS.find((item) => item.id === presetId);
  if (!preset) return [];
  return preset.rules.map((item, index) => ({ ...item, id: `${preset.id}-${index}` }));
}

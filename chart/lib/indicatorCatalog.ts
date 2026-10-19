import type { CompareOp, Condition, LineName, LineSpec, Operand } from "./strategyRules";

export const CATEGORIES = ["Ortalama", "Osilatör", "Bant", "Fiyat"] as const;
export type Category = (typeof CATEGORIES)[number];

export function lineSpec(name: LineName, patch: Partial<LineSpec> = {}): LineSpec {
  return {
    name,
    period: 14,
    fast: 12,
    slow: 26,
    signal: 9,
    mult: 2,
    atrPeriod: 10,
    smooth: 3,
    line: name === "macd" ? "macd" : name === "stoch" ? "k" : name === "bb" || name === "keltner" || name === "donchian" ? "middle" : "line",
    ...patch,
  };
}

const closePrice: Operand = { source: "price", field: "close" };
const zero: Operand = { source: "constant", value: 0 };

function compare(left: Operand, op: CompareOp, right: Operand, length = 20): Condition {
  return { id: "", kind: "compare", left, op, right, length };
}

function indicator(spec: LineSpec): Operand {
  return { source: "indicator", spec };
}

export type CatalogEntry = {
  id: string;
  label: string;
  category: Category;
  keywords: string;
  create: () => Condition;
};

export const CATALOG: CatalogEntry[] = [
  { id: "ema-cross", label: "EMA kesişimi", category: "Ortalama", keywords: "ema kesisim", create: () => ({ id: "", kind: "ema-cross", fast: 20, slow: 50, direction: "up" }) },
  { id: "sma", label: "SMA", category: "Ortalama", keywords: "sma basit ortalama", create: () => compare(closePrice, "cross-up", indicator(lineSpec("sma", { period: 20 }))) },
  { id: "ema", label: "EMA", category: "Ortalama", keywords: "ema ustel", create: () => compare(closePrice, "cross-up", indicator(lineSpec("ema", { period: 20 }))) },
  { id: "wma", label: "WMA", category: "Ortalama", keywords: "wma agirlikli", create: () => compare(closePrice, "cross-up", indicator(lineSpec("wma", { period: 20 }))) },
  { id: "hma", label: "HMA", category: "Ortalama", keywords: "hma hull", create: () => compare(closePrice, "cross-up", indicator(lineSpec("hma", { period: 20 }))) },
  { id: "vwap", label: "VWAP", category: "Ortalama", keywords: "vwap hacim", create: () => compare(closePrice, "above", indicator(lineSpec("vwap", { period: 1 }))) },
  { id: "rsi", label: "RSI", category: "Osilatör", keywords: "rsi wilder", create: () => compare(indicator(lineSpec("rsi", { period: 14 })), "cross-up", { source: "constant", value: 30 }) },
  { id: "adx", label: "ADX", category: "Osilatör", keywords: "adx wilder", create: () => compare(indicator(lineSpec("adx", { period: 14 })), "above", { source: "constant", value: 25 }) },
  { id: "atr", label: "ATR", category: "Osilatör", keywords: "atr wilder", create: () => compare(indicator(lineSpec("atr", { period: 14 })), "above", { source: "constant", value: 1 }) },
  { id: "macd", label: "MACD", category: "Osilatör", keywords: "macd", create: () => compare(indicator(lineSpec("macd", { line: "macd" })), "cross-up", indicator(lineSpec("macd", { line: "signal" }))) },
  { id: "stoch", label: "Stochastic", category: "Osilatör", keywords: "stochastic stokastik", create: () => compare(indicator(lineSpec("stoch")), "cross-up", { source: "constant", value: 20 }) },
  { id: "cci", label: "CCI", category: "Osilatör", keywords: "cci", create: () => compare(indicator(lineSpec("cci", { period: 20 })), "cross-up", zero) },
  { id: "roc", label: "ROC", category: "Osilatör", keywords: "roc momentum", create: () => compare(indicator(lineSpec("roc", { period: 12 })), "above", zero) },
  { id: "obv", label: "OBV", category: "Osilatör", keywords: "obv hacim", create: () => compare(indicator(lineSpec("obv", { period: 1 })), "gt", zero) },
  { id: "bb", label: "Bollinger", category: "Bant", keywords: "bollinger bb", create: () => compare(closePrice, "cross-up", indicator(lineSpec("bb", { period: 20, line: "lower" }))) },
  { id: "keltner", label: "Keltner", category: "Bant", keywords: "keltner", create: () => compare(closePrice, "above", indicator(lineSpec("keltner", { period: 20, line: "middle" }))) },
  { id: "donchian", label: "Donchian", category: "Bant", keywords: "donchian", create: () => compare(closePrice, "above", indicator(lineSpec("donchian", { period: 20, line: "middle" }))) },
  { id: "supertrend", label: "Supertrend", category: "Bant", keywords: "supertrend", create: () => compare(closePrice, "above", indicator(lineSpec("supertrend", { period: 10, mult: 3 }))) },
  { id: "prev-high", label: "Önceki mumun yükseği", category: "Fiyat", keywords: "yuksek kirilim", create: () => compare(closePrice, "break-prev-high", zero, 1) },
  { id: "prev-low", label: "Önceki mumun düşüğü", category: "Fiyat", keywords: "dusuk kirilim", create: () => compare(closePrice, "break-prev-low", zero, 1) },
  { id: "n-high", label: "Son N mumun yükseği", category: "Fiyat", keywords: "n mum yuksek", create: () => compare(closePrice, "break-highest", zero, 20) },
  { id: "n-low", label: "Son N mumun düşüğü", category: "Fiyat", keywords: "n mum dusuk", create: () => compare(closePrice, "break-lowest", zero, 20) },
];

export function filterCatalog(query: string, category: Category | "Tümü") {
  const text = query.trim().toLocaleLowerCase("tr");
  return CATALOG.filter((entry) => (category === "Tümü" || entry.category === category) && (!text || entry.label.toLocaleLowerCase("tr").includes(text) || entry.keywords.includes(text)));
}

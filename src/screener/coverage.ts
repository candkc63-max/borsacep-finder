import type { Stock } from "@/data/stocks";
import type { MembershipBook } from "@/screener/membership";

export type DataStatus = "sample" | "ok" | "missing";

export const LICENSE_NOTE = "Güncel BIST evreni bağlanmadı. Borsa İstanbul veri dağıtımı sözleşme ister. Yahoo Finance yeniden dağıtımı yasaklar. Lisans doğrulanmadan yeni kaynak çekilmiyor.";

export const QUOTE_CACHE_KEY = "borsa101-quote-cache";
export const QUOTE_CACHE_TTL = 15 * 60 * 1000;

const TRACKED: { key: keyof Stock; label: string }[] = [
  { key: "changeDay", label: "günlük değişim" },
  { key: "volume", label: "hacim" },
  { key: "averageVolume", label: "ortalama hacim" },
  { key: "pe", label: "FK" },
  { key: "pb", label: "PD/DD" },
  { key: "eps", label: "EPS" },
  { key: "earningsGrowth", label: "net kâr büyümesi" },
  { key: "revenueGrowth", label: "satış büyümesi" },
  { key: "roe", label: "özsermaye kârlılığı" },
  { key: "dividendYield", label: "temettü verimi" },
];

export type CoverageRow = {
  dataStatus: DataStatus;
  dataSource: string;
  dataAsOf: string | null;
  missing: string[];
};

export function planBatches<T>(items: T[], size: number): T[][] {
  const width = Math.max(1, Math.floor(size) || 1);
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += width) batches.push(items.slice(index, index + width));
  return batches;
}

export function technicalQueue(tickers: string[], finished: string[], failed: string[]): string[] {
  const skip = new Set([...finished, ...failed]);
  return tickers.filter((ticker) => ticker && !skip.has(ticker));
}

export function missingLabels(stock: Stock, hasTechnical: boolean): string[] {
  if ((stock.dataStatus ?? "sample") !== "ok") return [];
  const missing = TRACKED.filter((item) => {
    const value = stock[item.key];
    return typeof value !== "number" || !Number.isFinite(value);
  }).map((item) => item.label);
  if (!hasTechnical) missing.push("gösterge");
  return missing;
}

export function coverageText(row: CoverageRow): string {
  if (row.dataStatus === "missing") return `${row.dataSource} · kotasyon yok`;
  if (row.dataStatus === "sample") return "Örnek liste · canlı kotasyon yok";
  const time = row.dataAsOf && Number.isFinite(Date.parse(row.dataAsOf))
    ? new Date(row.dataAsOf).toLocaleString("tr-TR")
    : "zaman yok";
  const gap = row.missing.length ? `eksik: ${row.missing.join(", ")}` : "eksik alan yok";
  return `${row.dataSource} · ${time} · ${gap}`;
}

export function coverageSummary(rows: { dataStatus: DataStatus }[]) {
  let scanned = 0;
  let missing = 0;
  let sample = 0;
  for (const row of rows) {
    if (row.dataStatus === "ok") scanned += 1;
    else if (row.dataStatus === "missing") missing += 1;
    else sample += 1;
  }
  return { universe: rows.length, scanned, missing, sample, fullBist: false };
}

function blankQuote(stock: Stock, asOf: string, source: string): Stock {
  return {
    ...stock,
    price: 0,
    marketCap: 0,
    pe: null,
    pb: null,
    roe: null,
    dividendYield: null,
    change1y: null,
    changeDay: null,
    volume: null,
    averageVolume: null,
    relativeVolume: null,
    eps: null,
    earningsGrowth: null,
    revenueGrowth: null,
    week52High: null,
    week52Distance: null,
    dataStatus: "missing",
    dataSource: source,
    dataAsOf: asOf,
  };
}

export function settleQuotes(universe: Stock[], results: { ticker: string; stock: Stock | null }[], asOf: string, source: string): Stock[] {
  const byTicker = new Map(results.map((item) => [item.ticker, item.stock]));
  return universe.map((stock) => {
    const live = byTicker.get(stock.ticker);
    if (live && live.price > 0) {
      return { ...live, dataStatus: "ok", dataSource: source, dataAsOf: asOf };
    }
    return blankQuote(stock, asOf, source);
  });
}

export type CachedQuote = { stock: Stock; storedAt: number };

export function mergeScan(base: Stock[], incoming: Stock[], cache: Record<string, CachedQuote>, now: number, ttlMs: number) {
  const byTicker = new Map(incoming.map((stock) => [stock.ticker, stock]));
  const scannedResponse = incoming.some((stock) => stock.dataStatus === "ok" || stock.dataStatus === "missing");
  const next: Record<string, CachedQuote> = {};
  for (const [ticker, entry] of Object.entries(cache)) {
    if (entry?.stock?.dataStatus === "ok" && entry.stock.price > 0 && entry.stock.dataAsOf) next[ticker] = entry;
  }
  const stocks = base.map((item) => {
    const live = byTicker.get(item.ticker);
    if (live?.dataStatus === "ok" && live.price > 0 && live.dataAsOf) {
      next[item.ticker] = { stock: live, storedAt: now };
      return live;
    }
    const cached = next[item.ticker];
    const fresh = cached != null && now - cached.storedAt <= ttlMs;
    if (fresh && cached) return cached.stock;
    if (live?.dataStatus === "missing") return live;
    if (scannedResponse) return blankQuote(item, new Date(now).toISOString(), "önbellek yok");
    return { ...item, dataStatus: item.dataStatus ?? "sample", dataSource: item.dataSource ?? "Örnek liste", dataAsOf: item.dataAsOf ?? null };
  });
  return { stocks, cache: next };
}

export function readQuoteCache(storage: Storage): Record<string, CachedQuote> {
  try {
    const parsed = JSON.parse(storage.getItem(QUOTE_CACHE_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const cache: Record<string, CachedQuote> = {};
    for (const [ticker, entry] of Object.entries(parsed as Record<string, CachedQuote>)) {
      if (entry?.stock?.dataStatus === "ok" && entry.stock.price > 0 && Number.isFinite(entry.storedAt)) cache[ticker] = entry;
    }
    return cache;
  } catch {
    return {};
  }
}

export function writeQuoteCache(cache: Record<string, CachedQuote>, storage: Storage) {
  storage.setItem(QUOTE_CACHE_KEY, JSON.stringify(cache));
}

export type QuoteReport = {
  source: string;
  asOf: string;
  stocks: Stock[];
  scanned: number;
  missing: number;
  universe: number;
  fullBist: false;
  membership: MembershipBook | null;
};

export function quoteReport(source: string, asOf: string, stocks: Stock[]): QuoteReport {
  const summary = coverageSummary(stocks.map((stock) => ({ dataStatus: stock.dataStatus ?? "sample" })));
  return {
    source,
    asOf,
    stocks,
    scanned: summary.scanned,
    missing: summary.missing,
    universe: summary.universe,
    fullBist: false,
    membership: null,
  };
}

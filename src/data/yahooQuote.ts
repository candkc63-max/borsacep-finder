import type { Stock } from "@/data/stocks";

type YahooNumber = { raw?: number } | number | null | undefined;

export type YahooModules = {
  summaryDetail?: Record<string, unknown>;
  defaultKeyStatistics?: Record<string, unknown>;
  financialData?: Record<string, unknown>;
  price?: Record<string, unknown>;
};

function raw(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "raw" in value) {
    const n = (value as YahooNumber & { raw?: number }).raw;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }
  return null;
}

function dividendPercent(summary: Record<string, unknown> | undefined, price: number | null): number | null {
  const stated = raw(summary?.dividendYield);
  if (stated != null && stated > 0) return stated > 1 ? stated : stated * 100;
  const rate = raw(summary?.dividendRate);
  if (rate != null && rate > 0 && price != null && price > 0) return (rate / price) * 100;
  return stated;
}

export function mapYahooQuote(base: Pick<Stock, "ticker" | "name" | "sector">, modules: YahooModules): Stock {
  const price = raw(modules.financialData?.currentPrice) ?? raw(modules.price?.regularMarketPrice);
  const pe = raw(modules.summaryDetail?.trailingPE) ?? raw(modules.defaultKeyStatistics?.trailingPE);
  const change = raw(modules.defaultKeyStatistics?.["52WeekChange"]);
  const roe = raw(modules.financialData?.returnOnEquity);
  const volume = raw(modules.price?.regularMarketVolume);
  const averageVolume = raw(modules.summaryDetail?.averageVolume) ?? raw(modules.price?.averageDailyVolume10Day) ?? raw(modules.summaryDetail?.averageDailyVolume10Day);
  const earningsGrowth = raw(modules.financialData?.earningsGrowth);
  const revenueGrowth = raw(modules.financialData?.revenueGrowth);
  const week52High = raw(modules.summaryDetail?.fiftyTwoWeekHigh);
  const changeDay = raw(modules.price?.regularMarketChangePercent);

  return {
    ticker: base.ticker,
    name: base.name,
    sector: base.sector,
    price: price ?? 0,
    marketCap: raw(modules.price?.marketCap) ?? raw(modules.summaryDetail?.marketCap) ?? 0,
    pe,
    pb: raw(modules.defaultKeyStatistics?.priceToBook),
    roe: roe == null ? null : roe * 100,
    dividendYield: dividendPercent(modules.summaryDetail, price),
    change1y: change == null ? null : change * 100,
    changeDay,
    volume,
    averageVolume,
    relativeVolume: volume != null && averageVolume != null && averageVolume > 0 ? volume / averageVolume : null,
    eps: raw(modules.defaultKeyStatistics?.trailingEps),
    earningsGrowth: earningsGrowth == null ? null : earningsGrowth * 100,
    revenueGrowth: revenueGrowth == null ? null : revenueGrowth * 100,
    week52High,
    week52Distance: week52High != null && price != null && week52High > 0 ? ((week52High - price) / week52High) * 100 : null,
  };
}

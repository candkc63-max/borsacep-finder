// Temel veriler: F/K, piyasa değeri (milyar TL), temettü verimi (%)
// Veri Yahoo Finance (RapidAPI) üzerinden edge function ile çekilir.
// API verisi yoksa deterministik fallback kullanılır.

import { getIndexMemberships } from "./indices";
import { stocks as mockStocks } from "./stockData";

export type MarketCapBucket = "small" | "mid" | "large";
export type PeBucket = "low" | "mid" | "high"; // <10, 10-20, >20
export type DivBucket = "none" | "low" | "mid" | "high"; // 0, 0-3, 3-6, >6

export interface Fundamentals {
  pe: number;          // F/K
  marketCap: number;   // milyar TL
  divYield: number;    // %
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function fallbackFundamentals(symbol: string): Fundamentals {
  const h = hash(symbol);
  const memberships = getIndexMemberships(symbol);
  let marketCap: number;
  if (memberships.includes("BIST30")) marketCap = 80 + (h % 420);
  else if (memberships.includes("BIST50")) marketCap = 20 + (h % 60);
  else marketCap = 1 + (h % 19);
  const peBase = (h >> 3) % 100;
  const pe = Math.round((4 + (peBase / 100) * 36) * 10) / 10;
  const dvBase = (h >> 5) % 100;
  const divYield = dvBase < 30 ? 0 : Math.round(((dvBase - 30) / 70) * 90) / 10;
  return { pe, marketCap, divYield };
}

// Runtime cache for real API data set by the data hook
const realDataCache = new Map<string, Partial<Fundamentals>>();

export function setRealFundamentals(symbol: string, f: Partial<Fundamentals>) {
  realDataCache.set(symbol, f);
}

export function getFundamentals(symbol: string): Fundamentals {
  const fb = fallbackFundamentals(symbol);
  const real = realDataCache.get(symbol);
  if (!real) return fb;
  return {
    pe: real.pe ?? fb.pe,
    marketCap: real.marketCap ?? fb.marketCap,
    divYield: real.divYield ?? fb.divYield,
  };
}

// Suppress unused import warning - kept for potential future use
void mockStocks;

export function getMarketCapBucket(marketCap: number): MarketCapBucket {
  if (marketCap >= 50) return "large";
  if (marketCap >= 10) return "mid";
  return "small";
}

export function matchPe(pe: number, bucket: PeBucket): boolean {
  if (bucket === "low") return pe < 10;
  if (bucket === "mid") return pe >= 10 && pe <= 20;
  return pe > 20;
}

export function matchDiv(div: number, bucket: DivBucket): boolean {
  if (bucket === "none") return div === 0;
  if (bucket === "low") return div > 0 && div < 3;
  if (bucket === "mid") return div >= 3 && div <= 6;
  return div > 6;
}

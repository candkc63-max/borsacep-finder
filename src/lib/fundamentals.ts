// Mock temel veriler: F/K, piyasa değeri (TL), temettü verimi (%)
// Gerçek veri kaynağı eklenene kadar deterministik olarak sembolden üretilir.

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

// BIST30 sembolleri büyük cap, BIST50 ek mid, geri kalan small (basit varsayım)
import { getIndexMemberships } from "./indices";

export function getFundamentals(symbol: string): Fundamentals {
  const h = hash(symbol);
  const memberships = getIndexMemberships(symbol);

  // Piyasa değeri (milyar TL)
  let marketCap: number;
  if (memberships.includes("BIST30")) {
    marketCap = 80 + (h % 420); // 80-500B
  } else if (memberships.includes("BIST50")) {
    marketCap = 20 + (h % 60);  // 20-80B
  } else {
    marketCap = 1 + (h % 19);   // 1-20B
  }

  // F/K
  const peBase = (h >> 3) % 100; // 0-99
  const pe = Math.round((4 + (peBase / 100) * 36) * 10) / 10; // 4 - 40

  // Temettü verimi (%)
  const dvBase = (h >> 5) % 100;
  // %30 ihtimal temettü yok
  const divYield = dvBase < 30 ? 0 : Math.round(((dvBase - 30) / 70) * 90) / 10; // 0 - 9.0

  return { pe, marketCap, divYield };
}

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

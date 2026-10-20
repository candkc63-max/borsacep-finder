export type MembershipBook = {
  source: string;
  asOf: string;
  verified: true;
  bist100: string[];
  bist50: string[];
};

function tickers(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) return null;
  return value.map((item) => item.trim().toUpperCase());
}

/** Doğrulanmış kaynak, tarih ve açık üyelik listesi yoksa kitap kabul edilmez. */
export function acceptMembership(value: unknown): MembershipBook | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<MembershipBook>;
  if (raw.verified !== true) return null;
  if (typeof raw.source !== "string" || !raw.source.trim()) return null;
  if (typeof raw.asOf !== "string" || !raw.asOf.trim() || !Number.isFinite(Date.parse(raw.asOf))) return null;
  const bist100 = tickers(raw.bist100);
  const bist50 = tickers(raw.bist50);
  if (!bist100 || !bist50) return null;
  return { source: raw.source.trim(), asOf: raw.asOf, verified: true, bist100, bist50 };
}

export function indexesFor(ticker: string, book: MembershipBook | null = null): string[] {
  if (!book) return [];
  const indexes: string[] = [];
  if (book.bist100.includes(ticker)) indexes.push("BIST 100");
  if (book.bist50.includes(ticker)) indexes.push("BIST 50");
  return indexes;
}

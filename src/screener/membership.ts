/** Yerel etiket. Canlı Borsa İstanbul endeks bileşimi değildir. */
const BIST_100 = new Set([
  "AKBNK", "ARCLK", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL", "FROTO", "GARAN", "ISCTR",
  "KCHOL", "MGROS", "PETKM", "PGSUS", "SAHOL", "SASA", "SISE", "TCELL", "THYAO", "TOASO",
  "TTKOM", "TUPRS", "ULKER", "VAKBN", "YKBNK",
]);

const BIST_50 = new Set([
  "AKBNK", "ASELS", "BIMAS", "ENKAI", "EREGL", "FROTO", "GARAN", "ISCTR", "KCHOL", "MGROS",
  "PGSUS", "SAHOL", "SASA", "SISE", "TCELL", "THYAO", "TOASO", "TUPRS", "YKBNK",
]);

export function indexesFor(ticker: string): string[] {
  const indexes: string[] = [];
  if (BIST_100.has(ticker)) indexes.push("BIST 100");
  if (BIST_50.has(ticker)) indexes.push("BIST 50");
  return indexes;
}

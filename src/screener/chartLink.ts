export function isChartHash(hash: string) {
  return hash === "#grafik" || hash.startsWith("#grafik?");
}

export function chartHash(ticker: string) {
  return `#grafik?hisse=${encodeURIComponent(ticker)}`;
}

export function tickerFromHash(hash: string): string | null {
  const match = hash.match(/[?&]hisse=([A-Za-z0-9]+)/);
  return match ? match[1].toUpperCase() : null;
}

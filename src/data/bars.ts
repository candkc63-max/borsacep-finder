export type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const BAR_INTERVALS = ["1d", "1h", "1wk"] as const;
export const BAR_RANGES = ["6mo", "1y", "2y", "5y"] as const;

export type BarInterval = (typeof BAR_INTERVALS)[number];
export type BarRange = (typeof BAR_RANGES)[number];

type ChartQuote = {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
};

export type YahooChartBody = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: ChartQuote[] };
    }>;
    error?: { description?: string } | null;
  };
};

export function yahooSymbol(input: string, bist: boolean): string {
  const symbol = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9.=\-]{1,15}$/.test(symbol)) throw new Error("Sembol geçersiz");
  if (symbol.includes(".") || symbol.includes("=")) return symbol;
  return bist ? `${symbol}.IS` : symbol;
}

export function mapYahooChart(body: YahooChartBody): Bar[] {
  const result = body.chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote) return [];
  const bars: Bar[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const time = times[i];
    if (time == null || open == null || high == null || low == null || close == null) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    bars.push({
      time,
      open,
      high,
      low,
      close,
      volume: Number(quote.volume?.[i] ?? 0),
    });
  }
  return bars;
}

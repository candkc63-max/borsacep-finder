import { BAR_INTERVALS, BAR_RANGES, mapYahooChart, yahooSymbol, type Bar, type BarInterval, type BarRange } from "../data/bars";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function loadYahooBars(symbol: string, interval: string, range: string, bist: boolean): Promise<{ symbol: string; bars: Bar[] }> {
  if (!BAR_INTERVALS.includes(interval as BarInterval)) throw new Error("Periyot geçersiz");
  if (!BAR_RANGES.includes(range as BarRange)) throw new Error("Aralık geçersiz");
  const yahoo = yahooSymbol(symbol, bist);
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);
  const body = await response.json();
  const bars = mapYahooChart(body);
  if (bars.length < 30) throw new Error("Yeterli mum yok");
  return { symbol: yahoo, bars };
}

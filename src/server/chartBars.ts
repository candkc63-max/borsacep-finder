import { choiceById } from "../../chart/lib/chartSearch.js";
import { barsFromYahoo, groupFourHours } from "../../chart/lib/yahooBars.js";
import type { OhlcBar } from "../../chart/lib/parseOhlcv";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type RequestSpec = {
  symbol: string;
  interval: "1d" | "1h" | "1wk";
  range: string;
  aggregate: "4h" | null;
};

/** Hisse kimliğinde interval boş veya 1d ise mevcut günlük istek aynen kalır. Endeks kimliğinde interval yok sayılır. */
export function chartSpec(id: string, interval?: string | null): RequestSpec | null {
  const stock = id.match(/^stock-([A-Z]{3,6})$/);
  if (stock && choiceById(id) && interval && interval !== "1d") {
    const symbol = `${stock[1]}.IS`;
    if (interval === "1h") return { symbol, interval: "1h", range: "60d", aggregate: null };
    if (interval === "4h") return { symbol, interval: "1h", range: "60d", aggregate: "4h" };
    if (interval === "1wk") return { symbol, interval: "1wk", range: "10y", aggregate: null };
    return null;
  }
  if (id === "xu100-1d") return { symbol: "XU100.IS", interval: "1d", range: "5y", aggregate: null };
  if (id === "xu100-1h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: null };
  if (id === "xu100-4h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: "4h" };
  if (id === "xu100-1wk") return { symbol: "XU100.IS", interval: "1wk", range: "10y", aggregate: null };
  if (id === "ixic-1d") return { symbol: "^IXIC", interval: "1d", range: "5y", aggregate: null };
  if (stock && choiceById(id)) return { symbol: `${stock[1]}.IS`, interval: "1d", range: "2y", aggregate: null };
  return null;
}

export async function loadChartBars(id: string, interval?: string | null): Promise<OhlcBar[]> {
  const spec = chartSpec(id, interval);
  if (!spec) throw new Error("Bilinmeyen grafik");
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.symbol)}`);
  url.searchParams.set("interval", spec.interval);
  url.searchParams.set("range", spec.range);
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${response.status} döndü`);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("Yahoo JSON döndürmedi");
  }
  const bars = barsFromYahoo(body);
  if (!bars.length) throw new Error("Yahoo mum vermedi");
  return spec.aggregate === "4h" ? groupFourHours(bars) : bars;
}

import { choiceById } from "../../chart/lib/chartSearch";
import { barsFromYahoo, groupFourHours } from "../../chart/lib/yahooBars";
import type { OhlcBar } from "../../chart/lib/parseOhlcv";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type RequestSpec = {
  symbol: string;
  interval: "1d" | "1h" | "1wk";
  range: string;
  aggregate: "4h" | null;
};

function specFor(id: string): RequestSpec | null {
  if (id === "xu100-1d") return { symbol: "XU100.IS", interval: "1d", range: "5y", aggregate: null };
  if (id === "xu100-1h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: null };
  if (id === "xu100-4h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: "4h" };
  if (id === "xu100-1wk") return { symbol: "XU100.IS", interval: "1wk", range: "10y", aggregate: null };
  if (id === "ixic-1d") return { symbol: "^IXIC", interval: "1d", range: "5y", aggregate: null };
  const stock = id.match(/^stock-([A-Z]{3,6})$/);
  if (stock && choiceById(id)) return { symbol: `${stock[1]}.IS`, interval: "1d", range: "2y", aggregate: null };
  return null;
}

export async function loadChartBars(id: string): Promise<OhlcBar[]> {
  const spec = specFor(id);
  if (!spec) throw new Error("Bilinmeyen grafik");
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.symbol)}`);
  url.searchParams.set("interval", spec.interval);
  url.searchParams.set("range", spec.range);
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!response.ok) throw new Error("Yahoo yanıt vermedi");
  const bars = barsFromYahoo(await response.json());
  if (!bars.length) throw new Error("Yahoo mum vermedi");
  return spec.aggregate === "4h" ? groupFourHours(bars) : bars;
}

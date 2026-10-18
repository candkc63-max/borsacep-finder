import { STOCKS } from "../../src/data/stocks";

export type ChartChoice = {
  id: string;
  title: string;
  detail: string;
  source: "csv" | "yahoo";
  keywords: string;
};

export const NAS100_CHOICE: ChartChoice = {
  id: "nas100-60",
  title: "Nasdaq 100",
  detail: "60 dk · dosya",
  source: "csv",
  keywords: "nasdaq nas100",
};

const PRESETS: ChartChoice[] = [
  { id: "xu100-1d", title: "BIST 100", detail: "günlük · Yahoo", source: "yahoo", keywords: "endeks xu100 bist günlük" },
  { id: "xu100-1h", title: "BIST 100", detail: "saatlik · Yahoo", source: "yahoo", keywords: "endeks xu100 bist saatlik" },
  { id: "xu100-4h", title: "BIST 100", detail: "4 saatlik · Yahoo", source: "yahoo", keywords: "endeks xu100 bist 4 saat" },
  { id: "xu100-1wk", title: "BIST 100", detail: "haftalık · Yahoo", source: "yahoo", keywords: "endeks xu100 bist haftalık" },
  NAS100_CHOICE,
  { id: "ixic-1d", title: "Nasdaq", detail: "günlük · Yahoo", source: "yahoo", keywords: "nasdaq ixic endeks günlük" },
];

const STOCK_CHOICES: ChartChoice[] = STOCKS.map((stock) => ({
  id: `stock-${stock.ticker}`,
  title: stock.ticker,
  detail: `${stock.name} · günlük · Yahoo`,
  source: "yahoo",
  keywords: `${stock.ticker} ${stock.name} hisse`,
}));

export function searchCharts(query: string): ChartChoice[] {
  const words = query.trim().toLocaleLowerCase("tr").split(/\s+/).filter(Boolean);
  if (!words.length) return PRESETS;
  return [...PRESETS, ...STOCK_CHOICES]
    .filter((item) => {
      const haystack = `${item.title} ${item.detail} ${item.keywords}`.toLocaleLowerCase("tr");
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, 12);
}

export function choiceById(id: string): ChartChoice | null {
  return [...PRESETS, ...STOCK_CHOICES].find((item) => item.id === id) ?? null;
}

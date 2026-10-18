import { STOCKS } from "../../src/data/stocks.js";

export type ChartChoice = {
  id: string;
  title: string;
  detail: string;
  source: "csv" | "yahoo";
  keywords: string;
  symbol: string;
  name: string;
  group: "endeks" | "hisse";
  interval: string;
  sector: string;
};

const FOLDS: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c", â: "a", î: "i", û: "u" };

export function foldSearch(value: string) {
  const lower = value.toLocaleLowerCase("tr");
  let folded = "";
  for (const char of lower) folded += FOLDS[char] ?? char;
  return folded;
}

function choice(item: Omit<ChartChoice, "keywords"> & { keywords: string }): ChartChoice {
  return item;
}

export const NAS100_CHOICE: ChartChoice = choice({
  id: "nas100-60",
  title: "Nasdaq 100",
  detail: "60 dk · dosya",
  source: "csv",
  keywords: "nasdaq nas100 endeks",
  symbol: "NAS100",
  name: "Nasdaq 100",
  group: "endeks",
  interval: "60dk",
  sector: "",
});

const PRESETS: ChartChoice[] = [
  choice({ id: "xu100-1h", title: "BIST 100", detail: "saatlik · Yahoo", source: "yahoo", keywords: "endeks xu100 bist saatlik 1s", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1s", sector: "" }),
  choice({ id: "xu100-4h", title: "BIST 100", detail: "4 saatlik · Yahoo", source: "yahoo", keywords: "endeks xu100 bist 4 saat 4s", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "4s", sector: "" }),
  choice({ id: "xu100-1d", title: "BIST 100", detail: "günlük · Yahoo", source: "yahoo", keywords: "endeks xu100 bist günlük 1g", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1G", sector: "" }),
  choice({ id: "xu100-1wk", title: "BIST 100", detail: "haftalık · Yahoo", source: "yahoo", keywords: "endeks xu100 bist haftalık 1h", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1H", sector: "" }),
  NAS100_CHOICE,
  choice({ id: "ixic-1d", title: "Nasdaq", detail: "günlük · Yahoo", source: "yahoo", keywords: "nasdaq ixic endeks günlük", symbol: "IXIC", name: "Nasdaq", group: "endeks", interval: "1G", sector: "" }),
];

const STOCK_CHOICES: ChartChoice[] = STOCKS.map((stock) => choice({
  id: `stock-${stock.ticker}`,
  title: stock.ticker,
  detail: `${stock.name} · günlük · Yahoo`,
  source: "yahoo",
  keywords: `${stock.ticker} ${stock.name} ${stock.sector} hisse`,
  symbol: stock.ticker,
  name: stock.name,
  group: "hisse",
  interval: "1G",
  sector: stock.sector,
}));

const ALL = [...PRESETS, ...STOCK_CHOICES];

function score(item: ChartChoice, folded: string, words: string[]) {
  const symbol = foldSearch(item.symbol);
  const name = foldSearch(item.name);
  if (symbol === folded) return 0;
  if (folded.length > 1 && symbol.startsWith(folded)) return 1;
  if (words.every((word) => symbol.includes(word))) return 2;
  if (words[0] && name.startsWith(words[0])) return 3;
  return 4;
}

export function searchCharts(query: string): ChartChoice[] {
  const words = foldSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return PRESETS;
  const folded = words.join(" ");
  return ALL
    .filter((item) => {
      const haystack = foldSearch(`${item.symbol} ${item.name} ${item.title} ${item.detail} ${item.keywords} ${item.sector}`);
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => score(a, folded, words) - score(b, folded, words) || a.symbol.localeCompare(b.symbol, "tr") || a.interval.localeCompare(b.interval, "tr"))
    .slice(0, 12);
}

export function browseCharts() {
  return { indexes: PRESETS, stocks: STOCK_CHOICES.slice(0, 8) };
}

export function choiceIntervals(id: string): ChartChoice[] {
  if (!id.startsWith("xu100-")) return [];
  return ["xu100-1h", "xu100-4h", "xu100-1d", "xu100-1wk"].flatMap((item) => {
    const found = ALL.find((choice) => choice.id === item);
    return found ? [found] : [];
  });
}

export function choiceById(id: string): ChartChoice | null {
  return [...PRESETS, ...STOCK_CHOICES].find((item) => item.id === id) ?? null;
}

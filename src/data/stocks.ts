export type Stock = {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  dividendYield: number | null;
  change1y: number | null;
  changeDay?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  relativeVolume?: number | null;
  eps?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  week52High?: number | null;
  week52Distance?: number | null;
};

export type StockFilter = {
  search: string;
  sector: string;
  peMax: string;
  pbMax: string;
  roeMin: string;
  dividendMin: string;
};

export const EMPTY_FILTER: StockFilter = {
  search: "",
  sector: "",
  peMax: "",
  pbMax: "",
  roeMin: "",
  dividendMin: "",
};

export const STOCKS: Stock[] = [
  { ticker: "GARAN", name: "Garanti BBVA", sector: "Bankacılık", price: 95.5, marketCap: 350_000_000_000, pe: 4.2, pb: 1.1, roe: 28, dividendYield: 3.2, change1y: 42 },
  { ticker: "AKBNK", name: "Akbank", sector: "Bankacılık", price: 65.3, marketCap: 280_000_000_000, pe: 3.8, pb: 0.9, roe: 26, dividendYield: 2.8, change1y: 38 },
  { ticker: "YKBNK", name: "Yapı Kredi", sector: "Bankacılık", price: 32.4, marketCap: 220_000_000_000, pe: 4.5, pb: 1.0, roe: 24, dividendYield: 2.5, change1y: 35 },
  { ticker: "ISCTR", name: "İş Bankası C", sector: "Bankacılık", price: 14.5, marketCap: 195_000_000_000, pe: 4.0, pb: 0.85, roe: 22, dividendYield: 3.8, change1y: 32 },
  { ticker: "VAKBN", name: "Vakıfbank", sector: "Bankacılık", price: 22.8, marketCap: 145_000_000_000, pe: 3.2, pb: 0.7, roe: 25, dividendYield: 1.5, change1y: 48 },
  { ticker: "ASELS", name: "Aselsan", sector: "Savunma", price: 132.5, marketCap: 280_000_000_000, pe: 18.5, pb: 4.2, roe: 22, dividendYield: 1.2, change1y: 65 },
  { ticker: "KCHOL", name: "Koç Holding", sector: "Holding", price: 165.3, marketCap: 420_000_000_000, pe: 8.2, pb: 1.4, roe: 18, dividendYield: 4.5, change1y: 28 },
  { ticker: "SAHOL", name: "Sabancı Holding", sector: "Holding", price: 92.8, marketCap: 285_000_000_000, pe: 6.5, pb: 1.1, roe: 17, dividendYield: 5.2, change1y: 22 },
  { ticker: "EREGL", name: "Ereğli Demir Çelik", sector: "Demir-Çelik", price: 43.5, marketCap: 152_000_000_000, pe: 12.5, pb: 0.95, roe: 8, dividendYield: 6.8, change1y: -8 },
  { ticker: "TUPRS", name: "Tüpraş", sector: "Enerji", price: 165.4, marketCap: 165_000_000_000, pe: 5.2, pb: 1.8, roe: 32, dividendYield: 8.5, change1y: 18 },
  { ticker: "BIMAS", name: "BİM Mağazaları", sector: "Perakende", price: 425.2, marketCap: 195_000_000_000, pe: 22.5, pb: 5.8, roe: 28, dividendYield: 1.8, change1y: 55 },
  { ticker: "MGROS", name: "Migros", sector: "Perakende", price: 285, marketCap: 92_000_000_000, pe: 18.2, pb: 4.5, roe: 25, dividendYield: 2.5, change1y: 48 },
  { ticker: "ULKER", name: "Ülker Bisküvi", sector: "Gıda", price: 125.5, marketCap: 48_000_000_000, pe: 14.5, pb: 2.2, roe: 16, dividendYield: 3.5, change1y: 28 },
  { ticker: "FROTO", name: "Ford Otosan", sector: "Otomotiv", price: 615, marketCap: 215_000_000_000, pe: 7.5, pb: 2.8, roe: 38, dividendYield: 12.5, change1y: 32 },
  { ticker: "TOASO", name: "Tofaş Oto", sector: "Otomotiv", price: 285, marketCap: 95_000_000_000, pe: 6.8, pb: 2.4, roe: 35, dividendYield: 8.2, change1y: 18 },
  { ticker: "THYAO", name: "Türk Hava Yolları", sector: "Havacılık", price: 352, marketCap: 485_000_000_000, pe: 5.5, pb: 1.8, roe: 38, dividendYield: 0, change1y: 42 },
  { ticker: "PGSUS", name: "Pegasus", sector: "Havacılık", price: 545, marketCap: 45_000_000_000, pe: 6.2, pb: 2.1, roe: 32, dividendYield: 0, change1y: 52 },
  { ticker: "TCELL", name: "Turkcell", sector: "Telekom", price: 82.5, marketCap: 145_000_000_000, pe: 11.5, pb: 1.8, roe: 18, dividendYield: 4.2, change1y: 12 },
  { ticker: "TTKOM", name: "Türk Telekom", sector: "Telekom", price: 48.2, marketCap: 88_000_000_000, pe: 8.5, pb: 1.4, roe: 17, dividendYield: 5.5, change1y: 8 },
  { ticker: "ENKAI", name: "Enka İnşaat", sector: "İnşaat", price: 38.5, marketCap: 165_000_000_000, pe: 8.5, pb: 1.2, roe: 14, dividendYield: 3.8, change1y: 22 },
  { ticker: "EKGYO", name: "Emlak Konut GYO", sector: "GYO", price: 21.5, marketCap: 82_000_000_000, pe: 6.8, pb: 0.85, roe: 12, dividendYield: 2.5, change1y: 15 },
  { ticker: "SISE", name: "Şişecam", sector: "Cam", price: 42.8, marketCap: 95_000_000_000, pe: 9.5, pb: 1.4, roe: 15, dividendYield: 3.2, change1y: 18 },
  { ticker: "PETKM", name: "Petkim", sector: "Kimya", price: 18.5, marketCap: 38_000_000_000, pe: 22.5, pb: 1.8, roe: 8, dividendYield: 1.2, change1y: -8 },
  { ticker: "SASA", name: "SASA Polyester", sector: "Kimya", price: 132, marketCap: 285_000_000_000, pe: 28.5, pb: 8.5, roe: 32, dividendYield: 0, change1y: 22 },
  { ticker: "LOGO", name: "Logo Yazılım", sector: "Teknoloji", price: 145, marketCap: 18_000_000_000, pe: 25.5, pb: 6.2, roe: 28, dividendYield: 1.8, change1y: 38 },
  { ticker: "KAREL", name: "Karel Elektronik", sector: "Teknoloji", price: 88, marketCap: 8_500_000_000, pe: 32.5, pb: 4.8, roe: 18, dividendYield: 0.8, change1y: 18 },
  { ticker: "ANHYT", name: "Anadolu Hayat Emeklilik", sector: "Sigorta", price: 56, marketCap: 12_500_000_000, pe: 5.8, pb: 1.2, roe: 22, dividendYield: 8.5, change1y: 22 },
  { ticker: "TURSG", name: "Türkiye Sigorta", sector: "Sigorta", price: 68, marketCap: 18_000_000_000, pe: 4.5, pb: 1.0, roe: 25, dividendYield: 6.5, change1y: 28 },
  { ticker: "ARCLK", name: "Arçelik", sector: "Beyaz Eşya", price: 95, marketCap: 65_000_000_000, pe: 12.8, pb: 1.5, roe: 14, dividendYield: 2.8, change1y: 18 },
  { ticker: "VESTL", name: "Vestel", sector: "Elektronik", price: 38, marketCap: 22_000_000_000, pe: 18.5, pb: 1.8, roe: 10, dividendYield: 0, change1y: 5 },
  { ticker: "TKFEN", name: "Tekfen Holding", sector: "Holding", price: 58, marketCap: 35_000_000_000, pe: 7.2, pb: 1.1, roe: 16, dividendYield: 3.5, change1y: 25 },
  { ticker: "AKSA", name: "Aksa Akrilik", sector: "Kimya", price: 52, marketCap: 28_000_000_000, pe: 9.5, pb: 1.6, roe: 18, dividendYield: 4.2, change1y: 22 },
];

export const SECTORS = Array.from(new Set(STOCKS.map((s) => s.sector))).sort((a, b) => a.localeCompare(b, "tr"));

function limit(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function filterStocks(stocks: Stock[], filter: StockFilter): Stock[] {
  const query = filter.search.trim().toLocaleLowerCase("tr");
  const peMax = limit(filter.peMax);
  const pbMax = limit(filter.pbMax);
  const roeMin = limit(filter.roeMin);
  const dividendMin = limit(filter.dividendMin);

  return stocks.filter((stock) => {
    if (query) {
      const haystack = `${stock.ticker} ${stock.name}`.toLocaleLowerCase("tr");
      if (!haystack.includes(query)) return false;
    }
    if (filter.sector && stock.sector !== filter.sector) return false;
    if (peMax != null && (stock.pe == null || stock.pe > peMax)) return false;
    if (pbMax != null && (stock.pb == null || stock.pb > pbMax)) return false;
    if (roeMin != null && (stock.roe == null || stock.roe < roeMin)) return false;
    if (dividendMin != null && (stock.dividendYield == null || stock.dividendYield < dividendMin)) return false;
    return true;
  });
}

export function formatCap(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(0)} Mr`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)} Mn`;
  return value.toFixed(0);
}

export type SortKey = "ticker" | "price" | "marketCap" | "pe" | "pb" | "roe" | "dividendYield" | "change1y";

export function sortStocks(stocks: Stock[], key: SortKey, desc: boolean): Stock[] {
  const copy = [...stocks];
  copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv, "tr") * (desc ? -1 : 1);
    }
    const an = av == null ? null : Number(av);
    const bn = bv == null ? null : Number(bv);
    if (an == null && bn == null) return 0;
    if (an == null) return 1;
    if (bn == null) return -1;
    return (an - bn) * (desc ? -1 : 1);
  });
  return copy;
}

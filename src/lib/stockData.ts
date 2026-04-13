// Mock BIST100 stock data with realistic prices
export interface Stock {
  symbol: string;
  name: string;
  prices: number[]; // last 200 daily close prices (newest first)
}

// Generate realistic price history
function generatePrices(base: number, volatility: number, trend: number): number[] {
  const prices: number[] = [];
  let price = base;
  for (let i = 0; i < 200; i++) {
    price = price * (1 + (Math.random() - 0.5 + trend) * volatility);
    price = Math.max(price * 0.5, price); // prevent going too low
    prices.push(Math.round(price * 100) / 100);
  }
  return prices.reverse(); // newest first
}

// Seed random for consistency
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const bist100Stocks = [
  { symbol: "THYAO", name: "Türk Hava Yolları", base: 285, vol: 0.025, trend: 0.002 },
  { symbol: "GARAN", name: "Garanti BBVA", base: 128, vol: 0.022, trend: 0.001 },
  { symbol: "AKBNK", name: "Akbank", base: 58, vol: 0.02, trend: 0.0015 },
  { symbol: "EREGL", name: "Ereğli Demir Çelik", base: 52, vol: 0.018, trend: -0.001 },
  { symbol: "KCHOL", name: "Koç Holding", base: 185, vol: 0.02, trend: 0.002 },
  { symbol: "SAHOL", name: "Sabancı Holding", base: 82, vol: 0.022, trend: 0.001 },
  { symbol: "SISE", name: "Şişecam", base: 45, vol: 0.025, trend: 0.0005 },
  { symbol: "TUPRS", name: "Tüpraş", base: 175, vol: 0.02, trend: 0.001 },
  { symbol: "YKBNK", name: "Yapı Kredi", base: 28, vol: 0.023, trend: 0.002 },
  { symbol: "BIMAS", name: "BİM Mağazaları", base: 320, vol: 0.015, trend: 0.001 },
  { symbol: "ASELS", name: "Aselsan", base: 58, vol: 0.02, trend: 0.003 },
  { symbol: "PGSUS", name: "Pegasus", base: 850, vol: 0.028, trend: 0.002 },
  { symbol: "TCELL", name: "Turkcell", base: 72, vol: 0.018, trend: 0.001 },
  { symbol: "TOASO", name: "Tofaş Oto", base: 215, vol: 0.02, trend: 0.0005 },
  { symbol: "FROTO", name: "Ford Otosan", base: 950, vol: 0.018, trend: 0.001 },
  { symbol: "ARCLK", name: "Arçelik", base: 175, vol: 0.022, trend: -0.0005 },
  { symbol: "HEKTS", name: "Hektaş", base: 75, vol: 0.03, trend: 0.002 },
  { symbol: "KOZAL", name: "Koza Altın", base: 95, vol: 0.025, trend: 0.003 },
  { symbol: "KOZAA", name: "Koza Anadolu", base: 35, vol: 0.028, trend: 0.002 },
  { symbol: "PETKM", name: "Petkim", base: 22, vol: 0.025, trend: -0.001 },
  { symbol: "TAVHL", name: "TAV Havalimanları", base: 95, vol: 0.02, trend: 0.001 },
  { symbol: "VESTL", name: "Vestel", base: 38, vol: 0.028, trend: 0.0015 },
  { symbol: "DOHOL", name: "Doğan Holding", base: 28, vol: 0.025, trend: 0.001 },
  { symbol: "EKGYO", name: "Emlak Konut GYO", base: 12, vol: 0.022, trend: -0.0005 },
  { symbol: "TTKOM", name: "Türk Telekom", base: 45, vol: 0.018, trend: 0.001 },
  { symbol: "SASA", name: "SASA Polyester", base: 52, vol: 0.035, trend: -0.002 },
  { symbol: "ENKAI", name: "Enka İnşaat", base: 32, vol: 0.018, trend: 0.001 },
  { symbol: "MGROS", name: "Migros", base: 380, vol: 0.02, trend: 0.0015 },
  { symbol: "SOKM", name: "Şok Marketler", base: 38, vol: 0.025, trend: 0.002 },
  { symbol: "GUBRF", name: "Gübre Fabrikaları", base: 165, vol: 0.025, trend: 0.001 },
  { symbol: "TKFEN", name: "Tekfen Holding", base: 145, vol: 0.022, trend: 0.0005 },
  { symbol: "ISCTR", name: "İş Bankası C", base: 15, vol: 0.022, trend: 0.001 },
  { symbol: "VAKBN", name: "Vakıfbank", base: 18, vol: 0.025, trend: 0.0015 },
  { symbol: "HALKB", name: "Halkbank", base: 16, vol: 0.028, trend: 0.001 },
  { symbol: "ISGYO", name: "İş GYO", base: 12, vol: 0.02, trend: 0.0005 },
  { symbol: "AEFES", name: "Anadolu Efes", base: 295, vol: 0.018, trend: 0.001 },
  { symbol: "ULKER", name: "Ülker Bisküvi", base: 175, vol: 0.02, trend: 0.001 },
  { symbol: "CCOLA", name: "Coca-Cola İçecek", base: 720, vol: 0.015, trend: 0.001 },
  { symbol: "OTKAR", name: "Otokar", base: 580, vol: 0.022, trend: 0.002 },
  { symbol: "KORDS", name: "Kordsa", base: 105, vol: 0.02, trend: 0.001 },
];

// Generate consistent data using seeded random
function generateStockData(): Stock[] {
  return bist100Stocks.map((s, idx) => {
    const rng = seededRandom(idx * 1000 + 42);
    const prices: number[] = [];
    let price = s.base;
    for (let i = 0; i < 200; i++) {
      price = price * (1 + (rng() - 0.5 + s.trend) * s.vol);
      prices.push(Math.round(price * 100) / 100);
    }
    // newest first
    return { symbol: s.symbol, name: s.name, prices: prices.reverse() };
  });
}

export const stocks = generateStockData();

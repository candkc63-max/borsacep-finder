// Mock BIST100 stock data with realistic prices
export interface Stock {
  symbol: string;
  name: string;
  prices: number[]; // last 200 daily close prices (newest first)
  volumes?: number[]; // last 200 daily volumes (newest first), optional
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
  { symbol: "AKSA", name: "Aksa Akrilik", base: 62, vol: 0.022, trend: 0.001 },
  { symbol: "ALARK", name: "Alarko Holding", base: 48, vol: 0.02, trend: 0.0005 },
  { symbol: "ANACM", name: "Anadolu Cam", base: 32, vol: 0.025, trend: 0.001 },
  { symbol: "ANHYT", name: "Anadolu Hayat Emeklilik", base: 18, vol: 0.018, trend: 0.001 },
  { symbol: "AYGAZ", name: "Aygaz", base: 145, vol: 0.018, trend: 0.001 },
  { symbol: "BAGFS", name: "Bagfaş", base: 78, vol: 0.025, trend: 0.002 },
  { symbol: "BRISA", name: "Brisa", base: 125, vol: 0.02, trend: 0.001 },
  { symbol: "BRYAT", name: "Borusan Yatırım", base: 95, vol: 0.022, trend: 0.0015 },
  { symbol: "BUCIM", name: "Bursa Çimento", base: 42, vol: 0.02, trend: 0.0005 },
  { symbol: "CEMTS", name: "Çemtaş", base: 55, vol: 0.025, trend: 0.001 },
  { symbol: "CIMSA", name: "Çimsa", base: 85, vol: 0.022, trend: 0.001 },
  { symbol: "DOAS", name: "Doğuş Otomotiv", base: 220, vol: 0.025, trend: 0.002 },
  { symbol: "ECILC", name: "Eczacıbaşı İlaç", base: 28, vol: 0.02, trend: 0.001 },
  { symbol: "EGEEN", name: "Ege Endüstri", base: 480, vol: 0.018, trend: 0.001 },
  { symbol: "ENJSA", name: "Enerjisa Enerji", base: 52, vol: 0.02, trend: 0.001 },
  { symbol: "GLYHO", name: "Global Yatırım Holding", base: 8, vol: 0.03, trend: 0.002 },
  { symbol: "GESAN", name: "Giresun Fındık", base: 65, vol: 0.028, trend: 0.001 },
  { symbol: "GOLTS", name: "Göltaş Çimento", base: 115, vol: 0.022, trend: 0.0005 },
  { symbol: "GOODY", name: "Goodyear", base: 280, vol: 0.02, trend: 0.001 },
  { symbol: "GSDHO", name: "GSD Holding", base: 12, vol: 0.025, trend: 0.001 },
  { symbol: "IPEKE", name: "İpek Doğal Enerji", base: 22, vol: 0.028, trend: 0.0015 },
  { symbol: "KAREL", name: "Karel Elektronik", base: 35, vol: 0.025, trend: 0.002 },
  { symbol: "KARSN", name: "Karsan Otomotiv", base: 28, vol: 0.03, trend: 0.002 },
  { symbol: "KARTN", name: "Kartonsan", base: 320, vol: 0.018, trend: 0.001 },
  { symbol: "KLRHO", name: "Kolorad Boya", base: 15, vol: 0.025, trend: 0.001 },
  { symbol: "KONTR", name: "Kontrolmatik", base: 95, vol: 0.028, trend: 0.003 },
  { symbol: "LOGO", name: "Logo Yazılım", base: 185, vol: 0.022, trend: 0.002 },
  { symbol: "MAVI", name: "Mavi Giyim", base: 145, vol: 0.025, trend: 0.001 },
  { symbol: "MPARK", name: "MLP Sağlık", base: 115, vol: 0.02, trend: 0.001 },
  { symbol: "NETAS", name: "Netaş Telekomünikasyon", base: 72, vol: 0.025, trend: 0.001 },
  { symbol: "ODAS", name: "Odaş Elektrik", base: 8, vol: 0.035, trend: 0.002 },
  { symbol: "OYAKC", name: "Oyak Çimento", base: 42, vol: 0.02, trend: 0.001 },
  { symbol: "PAPIL", name: "Papilon Savunma", base: 55, vol: 0.03, trend: 0.003 },
  { symbol: "PRKME", name: "Park Elektrik", base: 28, vol: 0.025, trend: 0.001 },
  { symbol: "QUAGR", name: "Quagr", base: 18, vol: 0.03, trend: 0.002 },
  { symbol: "SARKY", name: "Sarkuysan", base: 42, vol: 0.022, trend: 0.001 },
  { symbol: "SELEC", name: "Selçuk Ecza", base: 68, vol: 0.02, trend: 0.001 },
  { symbol: "SMRTG", name: "Smart Güneş Enerjisi", base: 35, vol: 0.035, trend: 0.003 },
  { symbol: "SNGYO", name: "Sinpaş GYO", base: 5, vol: 0.028, trend: 0.001 },
  { symbol: "TATGD", name: "Tat Gıda", base: 85, vol: 0.02, trend: 0.001 },
  { symbol: "TKNSA", name: "Teknosa", base: 22, vol: 0.025, trend: 0.0015 },
  { symbol: "TMSN", name: "Tümosan", base: 45, vol: 0.028, trend: 0.002 },
  { symbol: "TRGYO", name: "Torunlar GYO", base: 8, vol: 0.025, trend: 0.001 },
  { symbol: "TTRAK", name: "Türk Traktör", base: 680, vol: 0.02, trend: 0.001 },
  { symbol: "TURSG", name: "Türkiye Sigorta", base: 32, vol: 0.022, trend: 0.001 },
  { symbol: "ULUUN", name: "Ulusoy Un", base: 58, vol: 0.022, trend: 0.001 },
  { symbol: "VERUS", name: "Verusa Holding", base: 42, vol: 0.025, trend: 0.002 },
  { symbol: "VESBE", name: "Vestel Beyaz Eşya", base: 75, vol: 0.022, trend: 0.001 },
  { symbol: "YATAS", name: "Yataş", base: 38, vol: 0.025, trend: 0.001 },
  { symbol: "YUNSA", name: "Yünsa", base: 55, vol: 0.022, trend: 0.001 },
  { symbol: "ZOREN", name: "Zorlu Enerji", base: 4, vol: 0.03, trend: 0.002 },
  { symbol: "AKSEN", name: "Aksa Enerji", base: 28, vol: 0.025, trend: 0.001 },
  { symbol: "BERA", name: "Bera Holding", base: 8, vol: 0.035, trend: 0.003 },
  { symbol: "BTCIM", name: "Batıçim", base: 65, vol: 0.022, trend: 0.001 },
  { symbol: "CEMAS", name: "Çemaş Döküm", base: 5, vol: 0.03, trend: 0.002 },
  { symbol: "DESA", name: "Desa Deri", base: 42, vol: 0.025, trend: 0.001 },
  { symbol: "ERBOS", name: "Erbosan", base: 185, vol: 0.02, trend: 0.001 },
  { symbol: "FENER", name: "Fenerbahçe Futbol", base: 115, vol: 0.03, trend: 0.002 },
  { symbol: "GEDZA", name: "Gediz Ambalaj", base: 28, vol: 0.025, trend: 0.001 },
  { symbol: "HUBGL", name: "Hub Girişim", base: 18, vol: 0.028, trend: 0.002 },
];

function generateStockData(): Stock[] {
  return bist100Stocks.map((s, idx) => {
    const rng = seededRandom(idx * 1000 + 42);
    const prices: number[] = [];
    let price = s.base;
    for (let i = 0; i < 200; i++) {
      price = price * (1 + (rng() - 0.5 + s.trend) * s.vol);
      prices.push(Math.round(price * 100) / 100);
    }
    return { symbol: s.symbol, name: s.name, prices: prices.reverse() };
  });
}

export const stocks = generateStockData();
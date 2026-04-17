// BIST sembol → sektör eşlemesi
export const SECTORS = [
  "Banka",
  "Holding",
  "Sanayi",
  "Otomotiv",
  "Havacılık",
  "Enerji",
  "GYO",
  "Perakende",
  "Gıda & İçecek",
  "Teknoloji",
  "İnşaat & Çimento",
  "Kimya",
  "Madencilik",
  "Telekom",
  "Sigorta",
  "Savunma",
  "Diğer",
] as const;

export type Sector = (typeof SECTORS)[number];

const SYMBOL_TO_SECTOR: Record<string, Sector> = {
  // Banka
  GARAN: "Banka", AKBNK: "Banka", YKBNK: "Banka", ISCTR: "Banka", VAKBN: "Banka", HALKB: "Banka",
  // Holding
  KCHOL: "Holding", SAHOL: "Holding", DOHOL: "Holding", TKFEN: "Holding", ALARK: "Holding",
  GLYHO: "Holding", GSDHO: "Holding", BRYAT: "Holding", VERUS: "Holding", BERA: "Holding",
  // Otomotiv
  TOASO: "Otomotiv", FROTO: "Otomotiv", DOAS: "Otomotiv", OTKAR: "Otomotiv", KARSN: "Otomotiv",
  TTRAK: "Otomotiv", TMSN: "Otomotiv",
  // Havacılık
  THYAO: "Havacılık", PGSUS: "Havacılık", TAVHL: "Havacılık",
  // Enerji
  TUPRS: "Enerji", PETKM: "Enerji", AYGAZ: "Enerji", ENJSA: "Enerji", AKSEN: "Enerji",
  ZOREN: "Enerji", ODAS: "Enerji", IPEKE: "Enerji", SMRTG: "Enerji", PRKME: "Enerji",
  // GYO
  EKGYO: "GYO", ISGYO: "GYO", SNGYO: "GYO", TRGYO: "GYO",
  // Perakende
  BIMAS: "Perakende", MGROS: "Perakende", SOKM: "Perakende", MAVI: "Perakende",
  TKNSA: "Perakende", DESA: "Perakende",
  // Gıda & İçecek
  AEFES: "Gıda & İçecek", ULKER: "Gıda & İçecek", CCOLA: "Gıda & İçecek", TATGD: "Gıda & İçecek",
  ULUUN: "Gıda & İçecek", GESAN: "Gıda & İçecek",
  // Teknoloji
  ASELS: "Teknoloji", LOGO: "Teknoloji", KAREL: "Teknoloji", NETAS: "Teknoloji",
  KONTR: "Teknoloji",
  // İnşaat & Çimento
  ENKAI: "İnşaat & Çimento", SISE: "İnşaat & Çimento", ANACM: "İnşaat & Çimento",
  CIMSA: "İnşaat & Çimento", BUCIM: "İnşaat & Çimento", GOLTS: "İnşaat & Çimento",
  OYAKC: "İnşaat & Çimento", BTCIM: "İnşaat & Çimento",
  // Kimya
  HEKTS: "Kimya", SASA: "Kimya", GUBRF: "Kimya", AKSA: "Kimya", BAGFS: "Kimya",
  // Madencilik
  EREGL: "Madencilik", KOZAL: "Madencilik", KOZAA: "Madencilik", SARKY: "Madencilik",
  CEMTS: "Madencilik", CEMAS: "Madencilik", ERBOS: "Madencilik",
  // Telekom
  TCELL: "Telekom", TTKOM: "Telekom",
  // Sigorta
  ANHYT: "Sigorta", TURSG: "Sigorta",
  // Savunma
  PAPIL: "Savunma",
  // Sanayi (varsayılan büyük üreticiler)
  ARCLK: "Sanayi", VESTL: "Sanayi", VESBE: "Sanayi", BRISA: "Sanayi", KORDS: "Sanayi",
  GOODY: "Sanayi", EGEEN: "Sanayi", YATAS: "Sanayi", YUNSA: "Sanayi", KARTN: "Sanayi",
  GEDZA: "Sanayi", SELEC: "Sanayi", ECILC: "Sanayi", MPARK: "Sanayi", HUBGL: "Sanayi",
  KLRHO: "Sanayi", QUAGR: "Sanayi", FENER: "Sanayi",
};

export function getSector(symbol: string): Sector {
  return SYMBOL_TO_SECTOR[symbol] ?? "Diğer";
}

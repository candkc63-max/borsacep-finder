const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BIST100_SYMBOLS = [
  "THYAO","GARAN","AKBNK","EREGL","KCHOL","SAHOL","SISE","TUPRS","YKBNK","BIMAS",
  "ASELS","PGSUS","TCELL","TOASO","FROTO","ARCLK","HEKTS","KOZAL","KOZAA","PETKM",
  "TAVHL","VESTL","DOHOL","EKGYO","TTKOM","SASA","ENKAI","MGROS","SOKM","GUBRF",
  "TKFEN","ISCTR","VAKBN","HALKB","ISGYO","AEFES","ULKER","CCOLA","OTKAR","KORDS",
  "AKSA","ALARK","ANACM","ANHYT","AYGAZ","BAGFS","BRISA","BRYAT","BUCIM","CEMTS",
  "CIMSA","DOAS","ECILC","EGEEN","ENJSA","GLYHO","GESAN","GOLTS","GOODY","GSDHO",
  "IPEKE","KAREL","KARSN","KARTN","KLRHO","KONTR","LOGO","MAVI","MPARK","NETAS",
  "ODAS","OYAKC","PAPIL","PRKME","QUAGR","SARKY","SELEC","SMRTG","SNGYO","TATGD",
  "TKNSA","TMSN","TRGYO","TTRAK","TURSG","ULUUN","VERUS","VESBE","YATAS","YUNSA",
  "ZOREN","AKSEN","BERA","BTCIM","CEMAS","DESA","ERBOS","FENER","GEDZA","HUBGL"
];

const STOCK_NAMES: Record<string, string> = {
  THYAO:"Türk Hava Yolları",GARAN:"Garanti BBVA",AKBNK:"Akbank",EREGL:"Ereğli Demir Çelik",
  KCHOL:"Koç Holding",SAHOL:"Sabancı Holding",SISE:"Şişecam",TUPRS:"Tüpraş",
  YKBNK:"Yapı Kredi",BIMAS:"BİM Mağazaları",ASELS:"Aselsan",PGSUS:"Pegasus",
  TCELL:"Turkcell",TOASO:"Tofaş Oto",FROTO:"Ford Otosan",ARCLK:"Arçelik",
  HEKTS:"Hektaş",KOZAL:"Koza Altın",KOZAA:"Koza Anadolu",PETKM:"Petkim",
  TAVHL:"TAV Havalimanları",VESTL:"Vestel",DOHOL:"Doğan Holding",EKGYO:"Emlak Konut GYO",
  TTKOM:"Türk Telekom",SASA:"SASA Polyester",ENKAI:"Enka İnşaat",MGROS:"Migros",
  SOKM:"Şok Marketler",GUBRF:"Gübre Fabrikaları",TKFEN:"Tekfen Holding",ISCTR:"İş Bankası C",
  VAKBN:"Vakıfbank",HALKB:"Halkbank",ISGYO:"İş GYO",AEFES:"Anadolu Efes",
  ULKER:"Ülker Bisküvi",CCOLA:"Coca-Cola İçecek",OTKAR:"Otokar",KORDS:"Kordsa",
  AKSA:"Aksa Akrilik",ALARK:"Alarko Holding",ANACM:"Anadolu Cam",ANHYT:"Anadolu Hayat Emeklilik",
  AYGAZ:"Aygaz",BAGFS:"Bagfaş",BRISA:"Brisa",BRYAT:"Borusan Yatırım",
  BUCIM:"Bursa Çimento",CEMTS:"Çemtaş",CIMSA:"Çimsa",DOAS:"Doğuş Otomotiv",
  ECILC:"Eczacıbaşı İlaç",EGEEN:"Ege Endüstri",ENJSA:"Enerjisa Enerji",GLYHO:"Global Yatırım Holding",
  GESAN:"Giresun Fındık",GOLTS:"Göltaş Çimento",GOODY:"Goodyear",GSDHO:"GSD Holding",
  IPEKE:"İpek Doğal Enerji",KAREL:"Karel Elektronik",KARSN:"Karsan Otomotiv",KARTN:"Kartonsan",
  KLRHO:"Kolorad Boya",KONTR:"Kontrolmatik",LOGO:"Logo Yazılım",MAVI:"Mavi Giyim",
  MPARK:"MLP Sağlık",NETAS:"Netaş Telekomünikasyon",ODAS:"Odaş Elektrik",OYAKC:"Oyak Çimento",
  PAPIL:"Papilon Savunma",PRKME:"Park Elektrik",QUAGR:"Quagr",SARKY:"Sarkuysan",
  SELEC:"Selçuk Ecza",SMRTG:"Smart Güneş Enerjisi",SNGYO:"Sinpaş GYO",TATGD:"Tat Gıda",
  TKNSA:"Teknosa",TMSN:"Tümosan",TRGYO:"Torunlar GYO",TTRAK:"Türk Traktör",
  TURSG:"Türkiye Sigorta",ULUUN:"Ulusoy Un",VERUS:"Verusa Holding",VESBE:"Vestel Beyaz Eşya",
  YATAS:"Yataş",YUNSA:"Yünsa",ZOREN:"Zorlu Enerji",AKSEN:"Aksa Enerji",
  BERA:"Bera Holding",BTCIM:"Batıçim",CEMAS:"Çemaş Döküm",DESA:"Desa Deri",
  ERBOS:"Erbosan",FENER:"Fenerbahçe Futbol",GEDZA:"Gediz Ambalaj",HUBGL:"Hub Girişim"
};

const EODHD_KEY = Deno.env.get("EODHD_API_KEY");
const EODHD_BASE = "https://eodhd.com/api";

interface Fundamentals {
  pe: number | null;
  marketCap: number | null; // milyar TL
  divYield: number | null;  // %
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString().slice(0, 10);
}

// EOD historical end-of-day prices for BIST (.IS)
async function fetchEodPrices(symbol: string): Promise<number[] | null> {
  if (!EODHD_KEY) return null;
  try {
    const eodSymbol = `${symbol}.IS`;
    const from = isoDaysAgo(300);
    const to = isoDaysAgo(0);
    const url = `${EODHD_BASE}/eod/${eodSymbol}?api_token=${EODHD_KEY}&fmt=json&from=${from}&to=${to}&period=d`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) {
      console.error(`EOD prices error ${symbol}: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    // EOD returns ascending by date; we want most-recent first, last 200
    const closes = data
      .map((d: { close?: number; adjusted_close?: number }) =>
        typeof d.adjusted_close === "number" ? d.adjusted_close : d.close
      )
      .filter((c): c is number => typeof c === "number");
    return closes.reverse().slice(0, 200);
  } catch (err) {
    console.error(`EOD prices exception ${symbol}:`, err);
    return null;
  }
}

// EOD fundamentals: PE, MarketCap, DividendYield
async function fetchEodFundamentals(symbol: string): Promise<Fundamentals> {
  const empty: Fundamentals = { pe: null, marketCap: null, divYield: null };
  if (!EODHD_KEY) return empty;
  try {
    const eodSymbol = `${symbol}.IS`;
    const url = `${EODHD_BASE}/fundamentals/${eodSymbol}?api_token=${EODHD_KEY}&filter=Highlights`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) {
      // 404 is common for some BIST tickers without coverage
      return empty;
    }
    const h = await resp.json();
    const pe = typeof h?.PERatio === "number" ? h.PERatio : null;
    // EOD MarketCapitalization is in local currency (TL). Convert to milyar TL.
    const mcRaw = typeof h?.MarketCapitalization === "number" ? h.MarketCapitalization : null;
    const marketCap = mcRaw ? Math.round((mcRaw / 1_000_000_000) * 10) / 10 : null;
    const dy = typeof h?.DividendYield === "number" ? h.DividendYield : null;
    // EOD DividendYield is decimal (e.g. 0.045). Convert to %.
    const divYield = dy !== null ? Math.round(dy * 1000) / 10 : null;
    return { pe, marketCap, divYield };
  } catch (err) {
    console.error(`EOD fundamentals exception ${symbol}:`, err);
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!EODHD_KEY) {
      return new Response(
        JSON.stringify({ error: "EODHD_API_KEY is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const results: Array<{ symbol: string; name: string; prices: number[]; fundamentals: Fundamentals }> = [];

    // 10 paralel istek; EOD dakikada 1000+ izin verir, sorun olmaz
    for (let i = 0; i < BIST100_SYMBOLS.length; i += 10) {
      const batch = BIST100_SYMBOLS.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const [prices, fundamentals] = await Promise.all([
            fetchEodPrices(symbol),
            fetchEodFundamentals(symbol),
          ]);
          if (prices && prices.length >= 50) {
            return { symbol, name: STOCK_NAMES[symbol] || symbol, prices, fundamentals };
          }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    return new Response(JSON.stringify({ stocks: results, timestamp: Date.now() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in bist-stocks function:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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

interface Fundamentals {
  pe: number | null;
  marketCap: number | null;
  divYield: number | null;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

// Yahoo Finance: BIST symbols use `.IS` suffix (e.g. THYAO.IS)
async function fetchYahooPrices(symbol: string): Promise<{ prices: number[]; volumes: number[] } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&range=1y`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      console.error(`Yahoo HTTP ${resp.status} for ${symbol}`);
      return null;
    }
    const data: YahooChartResponse = await resp.json();
    if (data?.chart?.error) {
      console.error(`Yahoo error ${symbol}:`, data.chart.error);
      return null;
    }
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const closesRaw = quote?.close;
    const volumesRaw = quote?.volume;
    if (!Array.isArray(closesRaw)) return null;

    // Filter null entries (non-trading days), keep aligned closes/volumes, then reverse to newest-first
    const closes: number[] = [];
    const volumes: number[] = [];
    for (let i = 0; i < closesRaw.length; i++) {
      const c = closesRaw[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        closes.push(c);
        const v = volumesRaw?.[i];
        volumes.push(typeof v === "number" && Number.isFinite(v) ? v : 0);
      }
    }
    if (closes.length === 0) return null;
    return { prices: closes.reverse().slice(0, 200), volumes: volumes.reverse().slice(0, 200) };
  } catch (err) {
    console.error(`Yahoo exception ${symbol}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const emptyFundamentals: Fundamentals = { pe: null, marketCap: null, divYield: null };
    const results: Array<{ symbol: string; name: string; prices: number[]; volumes: number[]; fundamentals: Fundamentals }> = [];

    // Yahoo has no hard rate limit, but we batch in 10s of 10 to be polite (~10s total)
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 200;

    for (let i = 0; i < BIST100_SYMBOLS.length; i += BATCH_SIZE) {
      const batch = BIST100_SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const data = await fetchYahooPrices(symbol);
          if (data && data.prices.length >= 50) {
            return {
              symbol,
              name: STOCK_NAMES[symbol] || symbol,
              prices: data.prices,
              volumes: data.volumes,
              fundamentals: emptyFundamentals,
            };
          }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
      if (i + BATCH_SIZE < BIST100_SYMBOLS.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`Yahoo fetch complete: ${results.length}/${BIST100_SYMBOLS.length} symbols`);

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

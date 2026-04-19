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

const TD_KEY = Deno.env.get("TWELVE_DATA_API_KEY");
const TD_BASE = "https://api.twelvedata.com";

interface Fundamentals {
  pe: number | null;
  marketCap: number | null;
  divYield: number | null;
}

// Twelve Data: BIST symbol format is `SYMBOL:BIST` (e.g. "THYAO:BIST")
async function fetchTdPrices(symbol: string): Promise<number[] | null> {
  if (!TD_KEY) return null;
  try {
    const tdSymbol = `${symbol}:BIST`;
    const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=1day&outputsize=200&apikey=${TD_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) {
      console.error(`TD prices HTTP error ${symbol}: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    if (data?.status === "error") {
      console.error(`TD prices error ${symbol}: ${data?.message}`);
      return null;
    }
    const values = data?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    // Twelve Data returns most-recent first. Convert to oldest-first for indicator calc compatibility,
    // but useBistStocks expects descending (most-recent first). Match prior EOD behavior: most-recent first.
    const closes = values
      .map((v: { close?: string }) => (v.close ? parseFloat(v.close) : NaN))
      .filter((c: number) => Number.isFinite(c));
    return closes.slice(0, 200);
  } catch (err) {
    console.error(`TD prices exception ${symbol}:`, err);
    return null;
  }
}

// Free plan limit: 8 req/min. Sleep helper for batch pacing.
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TD_KEY) {
      return new Response(
        JSON.stringify({ error: "TWELVE_DATA_API_KEY is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const emptyFundamentals: Fundamentals = { pe: null, marketCap: null, divYield: null };
    const results: Array<{ symbol: string; name: string; prices: number[]; fundamentals: Fundamentals }> = [];

    // Free plan: 8 req/min. We send batches of 6 then wait ~60s. That's slow (~16 min for 100 symbols).
    // To stay responsive, cap at first 24 symbols per call (4 batches, ~3.5 min) — adjust as needed.
    // For full coverage, recommend upgrading Twelve Data plan.
    const BATCH_SIZE = 6;
    const BATCH_DELAY_MS = 61_000;
    const MAX_SYMBOLS = BIST100_SYMBOLS.length; // process all; will be slow on free tier

    for (let i = 0; i < MAX_SYMBOLS; i += BATCH_SIZE) {
      const batch = BIST100_SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const prices = await fetchTdPrices(symbol);
          if (prices && prices.length >= 50) {
            return { symbol, name: STOCK_NAMES[symbol] || symbol, prices, fundamentals: emptyFundamentals };
          }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
      if (i + BATCH_SIZE < MAX_SYMBOLS) {
        await sleep(BATCH_DELAY_MS);
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

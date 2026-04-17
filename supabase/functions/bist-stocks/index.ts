import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Full BIST100 stock symbols (Yahoo Finance uses .IS suffix)
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

const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_YFINANCE_KEY");
const RAPIDAPI_HOST = "yahoo-finance15.p.rapidapi.com";

interface Fundamentals {
  pe: number | null;
  marketCap: number | null; // milyar TL
  divYield: number | null;  // %
}

async function fetchYahooData(symbol: string): Promise<number[] | null> {
  try {
    const yahooSymbol = `${symbol}.IS`;
    const now = Math.floor(Date.now() / 1000);
    const from = now - 86400 * 300;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${from}&period2=${now}&interval=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      console.error(`Yahoo chart error for ${symbol}: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || !Array.isArray(closes)) return null;
    const valid = closes.filter((c: number | null) => c !== null) as number[];
    return valid.reverse().slice(0, 200);
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err);
    return null;
  }
}

async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const empty: Fundamentals = { pe: null, marketCap: null, divYield: null };
  if (!RAPIDAPI_KEY) return empty;
  try {
    const yahooSymbol = `${symbol}.IS`;
    // YH Finance (RapidAPI) - quote endpoint returns trailingPE, marketCap, dividendYield
    const url = `https://${RAPIDAPI_HOST}/api/yahoo/qu/quote/${yahooSymbol}`;
    const resp = await fetch(url, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      console.error(`RapidAPI fundamentals error for ${symbol}: ${resp.status}`);
      return empty;
    }
    const data = await resp.json();
    const q = Array.isArray(data?.body) ? data.body[0] : data?.body || data?.quoteResponse?.result?.[0] || data;
    const pe = typeof q?.trailingPE === "number" ? q.trailingPE : null;
    const mcRaw = typeof q?.marketCap === "number" ? q.marketCap : null;
    const marketCap = mcRaw ? Math.round((mcRaw / 1_000_000_000) * 10) / 10 : null; // milyar TL
    const dyRaw = typeof q?.trailingAnnualDividendYield === "number"
      ? q.trailingAnnualDividendYield
      : (typeof q?.dividendYield === "number" ? q.dividendYield : null);
    const divYield = dyRaw !== null ? Math.round(dyRaw * 100 * 10) / 10 : null;
    return { pe, marketCap, divYield };
  } catch (err) {
    console.error(`Error fetching fundamentals ${symbol}:`, err);
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const results: Array<{ symbol: string; name: string; prices: number[]; fundamentals: Fundamentals }> = [];

    // Process in batches of 10 to avoid rate limiting
    for (let i = 0; i < BIST100_SYMBOLS.length; i += 10) {
      const batch = BIST100_SYMBOLS.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const [prices, fundamentals] = await Promise.all([
            fetchYahooData(symbol),
            fetchFundamentals(symbol),
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
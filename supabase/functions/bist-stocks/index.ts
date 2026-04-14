const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      console.error(`Yahoo Finance error for ${symbol}: ${resp.status}`);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const results: Array<{ symbol: string; name: string; prices: number[] }> = [];
    
    // Process in batches of 10 to avoid rate limiting
    for (let i = 0; i < BIST100_SYMBOLS.length; i += 10) {
      const batch = BIST100_SYMBOLS.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const prices = await fetchYahooData(symbol);
          // Need at least 50 data points for meaningful technical analysis
          if (prices && prices.length >= 50) {
            return { symbol, name: STOCK_NAMES[symbol] || symbol, prices };
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
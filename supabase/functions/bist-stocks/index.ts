const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BIST100 stock symbols (Yahoo Finance uses .IS suffix)
const BIST100_SYMBOLS = [
  "THYAO","GARAN","AKBNK","EREGL","KCHOL","SAHOL","SISE","TUPRS","YKBNK","BIMAS",
  "ASELS","PGSUS","TCELL","TOASO","FROTO","ARCLK","HEKTS","KOZAL","KOZAA","PETKM",
  "TAVHL","VESTL","DOHOL","EKGYO","TTKOM","SASA","ENKAI","MGROS","SOKM","GUBRF",
  "TKFEN","ISCTR","VAKBN","HALKB","ISGYO","AEFES","ULKER","CCOLA","OTKAR","KORDS"
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
  ULKER:"Ülker Bisküvi",CCOLA:"Coca-Cola İçecek",OTKAR:"Otokar",KORDS:"Kordsa"
};

async function fetchYahooData(symbol: string): Promise<number[] | null> {
  try {
    const yahooSymbol = `${symbol}.IS`;
    const now = Math.floor(Date.now() / 1000);
    const from = now - 86400 * 300; // ~300 days to get 200 trading days
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${from}&period2=${now}&interval=1d`;
    
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    if (!resp.ok) {
      console.error(`Yahoo Finance error for ${symbol}: ${resp.status}`);
      return null;
    }
    
    const data = await resp.json();
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    
    if (!closes || !Array.isArray(closes)) return null;
    
    // Filter out nulls and reverse (newest first)
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
    // Fetch all stocks in parallel with batching
    const results: Array<{ symbol: string; name: string; prices: number[] }> = [];
    
    // Process in batches of 10 to avoid rate limiting
    for (let i = 0; i < BIST100_SYMBOLS.length; i += 10) {
      const batch = BIST100_SYMBOLS.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const prices = await fetchYahooData(symbol);
          if (prices && prices.length >= 20) {
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

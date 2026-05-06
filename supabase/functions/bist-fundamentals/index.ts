/**
 * BIST Temel Veri Çekici (bist-fundamentals)
 *
 * Yahoo Finance Quote Summary API'sinden BIST hisselerinin temel verilerini
 * çeker ve fundamentals tablosuna upsert eder.
 *
 * Çağrı:
 *   POST /bist-fundamentals
 *   body: { tickers?: string[]; full?: boolean }
 *
 *   - tickers verilmezse BIST100 default listesi
 *   - full=true ise tüm sembolleri günceller, false ise updated_at>24sa olanları
 *
 * Cron:
 *   Vercel cron veya manuel — günde 1 kez yeterli (temel veriler nadiren değişir)
 *
 * Auth:
 *   service_role bypass eder RLS'i; admin/cron çağırabilir
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIST_DEFAULT = [
  "THYAO", "GARAN", "AKBNK", "EREGL", "KCHOL", "SAHOL", "SISE", "TUPRS",
  "YKBNK", "BIMAS", "ASELS", "PGSUS", "TCELL", "TOASO", "FROTO", "ARCLK",
  "HEKTS", "PETKM", "TAVHL", "VESTL", "DOHOL", "EKGYO", "TTKOM", "SASA",
  "ENKAI", "MGROS", "SOKM", "GUBRF", "TKFEN", "ISCTR", "VAKBN", "HALKB",
  "ISGYO", "AEFES", "ULKER", "CCOLA", "OTKAR", "KORDS", "AKSA", "ALARK",
  "ANHYT", "AYGAZ", "BAGFS", "BRISA", "BRYAT", "BUCIM", "CEMTS", "CIMSA",
  "DOAS", "ECILC", "EGEEN", "ENJSA", "GLYHO", "GESAN", "GOLTS", "GOODY",
  "GSDHO", "KAREL", "KARSN", "KARTN", "KLRHO", "KONTR", "LOGO", "MAVI",
  "MPARK", "NETAS", "ODAS", "OYAKC", "PAPIL", "PRKME", "QUAGR", "SARKY",
  "SELEC", "SMRTG", "SNGYO", "TATGD", "TKNSA", "TMSN", "TRGYO", "TTRAK",
  "TURSG", "ULUUN", "VERUS", "VESBE", "YATAS", "YUNSA", "ZOREN", "AKSEN",
  "BERA", "BTCIM", "CEMAS", "DESA", "ERBOS", "FENER", "GEDZA",
];

interface YahooQuoteSummary {
  quoteSummary?: {
    result?: Array<{
      summaryProfile?: { sector?: string; longName?: string };
      price?: { longName?: string; marketCap?: { raw?: number } };
      financialData?: {
        currentPrice?: { raw?: number };
        debtToEquity?: { raw?: number };
        currentRatio?: { raw?: number };
        quickRatio?: { raw?: number };
        returnOnAssets?: { raw?: number };
        returnOnEquity?: { raw?: number };
        grossMargins?: { raw?: number };
        operatingMargins?: { raw?: number };
        profitMargins?: { raw?: number };
        revenueGrowth?: { raw?: number };
        earningsGrowth?: { raw?: number };
      };
      defaultKeyStatistics?: {
        priceToBook?: { raw?: number };
        forwardPE?: { raw?: number };
        trailingPE?: { raw?: number };
        pegRatio?: { raw?: number };
        priceToSalesTrailing12Months?: { raw?: number };
        enterpriseToEbitda?: { raw?: number };
        "52WeekChange"?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
      };
      summaryDetail?: {
        dividendYield?: { raw?: number };
        payoutRatio?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
        trailingPE?: { raw?: number };
        marketCap?: { raw?: number };
      };
    }>;
  };
}

function pct(v: number | undefined | null): number | null {
  if (typeof v !== "number") return null;
  return v * 100;
}

function num(v: number | undefined | null): number | null {
  if (typeof v !== "number" || !isFinite(v)) return null;
  return v;
}

async function fetchOne(ticker: string): Promise<Record<string, unknown> | null> {
  const symbol = ticker.endsWith(".IS") ? ticker : `${ticker}.IS`;
  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
  );
  url.searchParams.set(
    "modules",
    "summaryProfile,financialData,defaultKeyStatistics,summaryDetail,price",
  );

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    console.warn("Yahoo error", ticker, res.status);
    return null;
  }
  const data = (await res.json()) as YahooQuoteSummary;
  const r = data?.quoteSummary?.result?.[0];
  if (!r) return null;

  const fin = r.financialData;
  const stat = r.defaultKeyStatistics;
  const det = r.summaryDetail;
  const price = r.price;

  return {
    ticker: ticker.toUpperCase(),
    company_name: price?.longName ?? r.summaryProfile?.longName ?? null,
    sector: r.summaryProfile?.sector ?? null,
    market_cap: num(price?.marketCap?.raw ?? det?.marketCap?.raw),

    pe_ratio: num(stat?.trailingPE?.raw ?? det?.trailingPE?.raw),
    pb_ratio: num(stat?.priceToBook?.raw),
    ev_ebitda: num(stat?.enterpriseToEbitda?.raw),
    ps_ratio: num(stat?.priceToSalesTrailing12Months?.raw),
    peg_ratio: num(stat?.pegRatio?.raw),

    roe: pct(fin?.returnOnEquity?.raw),
    roa: pct(fin?.returnOnAssets?.raw),
    net_margin: pct(fin?.profitMargins?.raw),
    gross_margin: pct(fin?.grossMargins?.raw),
    operating_margin: pct(fin?.operatingMargins?.raw),

    revenue_growth: pct(fin?.revenueGrowth?.raw),
    earnings_growth: pct(fin?.earningsGrowth?.raw),

    debt_equity: num(fin?.debtToEquity?.raw),
    current_ratio: num(fin?.currentRatio?.raw),
    quick_ratio: num(fin?.quickRatio?.raw),

    dividend_yield: pct(det?.dividendYield?.raw),
    payout_ratio: pct(det?.payoutRatio?.raw),

    current_price: num(fin?.currentPrice?.raw),
    price_change_1y: pct(stat?.["52WeekChange"]?.raw),
    price_52w_high: num(stat?.fiftyTwoWeekHigh?.raw ?? det?.fiftyTwoWeekHigh?.raw),
    price_52w_low: num(stat?.fiftyTwoWeekLow?.raw ?? det?.fiftyTwoWeekLow?.raw),

    data_source: "yahoo",
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    let tickers: string[] = BIST_DEFAULT;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Array.isArray(body?.tickers) && body.tickers.length > 0) {
          tickers = body.tickers.map((s: string) => s.toUpperCase());
        }
      } catch {
        /* default kullan */
      }
    }

    // Yahoo'yu nazikçe çağır — 5 paralel, küçük gecikmelerle
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];
    const CHUNK = 5;
    for (let i = 0; i < tickers.length; i += CHUNK) {
      const chunk = tickers.slice(i, i + CHUNK);
      const settled = await Promise.allSettled(chunk.map(fetchOne));
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled" && s.value) {
          results.push(s.value);
        } else {
          errors.push(chunk[j]);
        }
      }
      // Kibar gecikme — 200ms
      await new Promise((r) => setTimeout(r, 200));
    }

    if (results.length > 0) {
      const { error } = await supabase.from("fundamentals").upsert(results, {
        onConflict: "ticker",
      });
      if (error) {
        console.error("Upsert error", error);
        return new Response(
          JSON.stringify({ error: "Upsert hatası", detail: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        updated: results.length,
        failed: errors.length,
        failedTickers: errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("bist-fundamentals", err);
    return new Response(
      JSON.stringify({ error: "Beklenmeyen hata", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

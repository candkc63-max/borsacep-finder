/**
 * BIST tarihsel mum verisi — Yahoo Finance üzerinden max aralık.
 * Bar Replay simülasyonu için kullanılır.
 *
 * GET /bist-history?symbol=THYAO&from=2000-01-01
 *
 * Notlar:
 * - Yahoo Finance halka açık endpoint, anahtar yok.
 * - "range=max" kullanır; bazı hisseler için 25+ yıl, bazıları için daha kısa.
 * - Bir BIST hissesi 2000'den önce halka açıldıysa veri tam gelir, sonra ise listeleme tarihinden başlar.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Candle {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface HistoryResponse {
  symbol: string;
  candles: Candle[];
  startUnix: number;
  endUnix: number;
  source: "yahoo";
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawSymbol = url.searchParams.get("symbol")?.trim().toUpperCase();
    if (!rawSymbol) {
      return json({ error: "symbol parametresi zorunlu" }, 400);
    }

    const fromIso = url.searchParams.get("from"); // örn 2000-01-01
    const toIso = url.searchParams.get("to");

    // Yahoo URL: ".IS" suffix BIST hisseleri için
    const yahooSymbol = rawSymbol.endsWith(".IS") ? rawSymbol : `${rawSymbol}.IS`;
    const yahoo = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
    );
    yahoo.searchParams.set("interval", "1d");

    if (fromIso) {
      const fromUnix = Math.floor(new Date(fromIso).getTime() / 1000);
      const toUnix = toIso
        ? Math.floor(new Date(toIso).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      yahoo.searchParams.set("period1", String(fromUnix));
      yahoo.searchParams.set("period2", String(toUnix));
    } else {
      yahoo.searchParams.set("range", "max");
    }

    const res = await fetch(yahoo.toString(), {
      headers: {
        // Bazı kullanıcı ajanı kombinasyonları rate-limit yiyor
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      console.error("Yahoo error", res.status, await res.text());
      return json({ error: "Yahoo Finance verisi alınamadı" }, 502);
    }

    const raw = (await res.json()) as YahooChartResponse;
    const result = raw?.chart?.result?.[0];
    if (!result) {
      return json({ error: "Sembol için veri bulunamadı" }, 404);
    }

    const ts = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0];
    if (!q || ts.length === 0) {
      return json({ error: "Mum verisi boş" }, 404);
    }

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const c = q.close?.[i];
      const v = q.volume?.[i];
      if (
        typeof o !== "number" || typeof h !== "number" ||
        typeof l !== "number" || typeof c !== "number"
      ) continue;
      candles.push({
        t: ts[i],
        o,
        h,
        l,
        c,
        v: typeof v === "number" ? v : 0,
      });
    }

    if (candles.length === 0) {
      return json({ error: "Geçerli mum bulunamadı" }, 404);
    }

    const body: HistoryResponse = {
      symbol: rawSymbol,
      candles,
      startUnix: candles[0].t,
      endUnix: candles[candles.length - 1].t,
      source: "yahoo",
    };

    // İstenen başlangıç gerçekten bulunamadıysa kullanıcıya not düş
    if (fromIso) {
      const requested = Math.floor(new Date(fromIso).getTime() / 1000);
      if (candles[0].t > requested + 86400 * 30) {
        body.note = `${rawSymbol} için ${fromIso} tarihinden öncesi yok. İlk veri: ${
          new Date(candles[0].t * 1000).toISOString().slice(0, 10)
        }`;
      }
    }

    return json(body, 200, {
      // 1 saat cache (tarihsel data değişmez, son gün de günlük güncellenir)
      "Cache-Control": "public, max-age=3600",
    });
  } catch (err) {
    console.error("bist-history error", err);
    return json({ error: "Beklenmeyen hata" }, 500);
  }
});

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
}

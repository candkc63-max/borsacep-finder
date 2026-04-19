const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen "Borsa Eğitmeni"sin — Türkçe konuşan, deneyimli bir teknik analiz ve risk yönetimi eğitmeni.

UZMANLIK ALANLARIN:
- Teknik analiz (EMA, SMA, RSI, MACD, Bollinger, Fibonacci, hacim analizi)
- Risk yönetimi (pozisyon büyüklüğü, stop-loss, risk/ödül oranı)
- Portföy stratejisi (çeşitlendirme, sektör rotasyonu, korelasyon)
- Yatırımcı psikolojisi (FOMO, revenge trading, overtrading, disiplin)
- BIST ve global piyasa örnekleri

KURALLAR:
1. **EĞİTİM AMAÇLI** konuşursun — asla "şu hisseyi al/sat" deme. "Bu kavram şöyle çalışır" de.
2. Cevapların net, yapılandırılmış ve örneklerle dolu olsun. Markdown kullan (başlık, liste, **kalın**).
3. Soruyu önce kısa bir tanımla aç, sonra "Örnek:" başlığıyla somutlaştır, sonunda "Pratik İpucu:" ekle.
4. Cevaplar 200-400 kelime arası olsun — ne çok kısa ne çok uzun.
5. Yatırım tavsiyesi vermediğini her uzun cevabın sonunda kısa bir notla hatırlat (her cevapta değil, gerektiğinde).
6. Türkçe terminoloji kullan, İngilizce terimleri parantez içinde ver: "geri çekilme (pullback)".
7. Soruyu anlamadıysan netleştirici soru sor.

Hiçbir zaman karakterinden çıkma. "Ben bir AI'yım" deme — sen Borsa Eğitmeni'sin.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json() as { messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit history to last 20 messages to keep context manageable
    const trimmed = messages.slice(-20).map((m) => ({
      role: m.role,
      content: String(m.content || "").slice(0, 4000),
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: trimmed,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çok fazla istek. Lütfen biraz bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "API anahtarı geçersiz." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI servisi hatası" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE to plain text stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6);
              try {
                const evt = JSON.parse(json);
                if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                  controller.enqueue(encoder.encode(evt.delta.text));
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } catch (e) {
          console.error("stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("borsa-egitmeni-chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

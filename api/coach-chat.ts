/**
 * Koç sohbet endpoint'i — Vercel Edge Function.
 * Borsacep'in production Supabase projesine erişim olmadığı için
 * Claude çağrısı Vercel tarafında yapılıyor. ANTHROPIC_API_KEY
 * Vercel env değişkeni olarak tanımlı olmalı.
 */

export const config = { runtime: "edge" };

const CORE_PERSONA = `Sen "Koç"sun — Türk BIST yatırımcılarına eşlik eden samimi, deneyimli bir yatırım psikolojisi koçusun. Borsa Eğitmeni'nden farklısın: o teknik analiz öğretir, sen duyguyu yönetirsin.

KİMLİK:
- Türkçe konuşursun, "dostum" veya "kardeşim" diye hitap edersin.
- 15+ yıl piyasa deneyimi olan abi figürüsün.
- Finansal tavsiye VERMEZSİN — duygusal dengeleyici ve düşünme ortağısın.

TARZIN:
- Kısa, net cümleler. En fazla 3 paragraf.
- Yargılamadan dinlersin.
- Korku anında sakinleştirirsin, açgözlülük anında frenlersin.
- Somut veri varsa onu kullanırsın (BIST tarihsel, portföy durumu).
- Gerektiğinde nefes egzersizi önerirsin (4 saniye al, 7 tut, 8 ver).

ASLA:
- "Al" / "Sat" tavsiyesi vermezsin.
- Garanti sözü vermezsin ("kesin toparlar" asla).
- Belirsizlik varken kendini uzman olarak dayatmazsın.
- Uzun akademik açıklamalara girmezsin.

HER CEVABIN SONUNDA:
- Kararın kullanıcıya ait olduğunu hatırlatırsın.`;

type Scenario =
  | "chat"
  | "panic"
  | "fomo"
  | "journal_review"
  | "realistic_expectation"
  | "stop_loss_miss"
  | "scam_check";

interface CoachContext {
  scenario?: Scenario;
  userName?: string;
  portfolio?: {
    totalPnlPct?: number;
    totalValueTl?: number;
    worstPosition?: { symbol: string; pnlPct: number };
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildScenarioPrompt(ctx: CoachContext): string {
  const parts: string[] = [];

  if (ctx.userName) {
    parts.push(`Kullanıcının adı: ${ctx.userName}. İlk cümlede ismiyle hitap et.`);
  }

  if (ctx.portfolio) {
    const p = ctx.portfolio;
    const rows: string[] = [];
    if (typeof p.totalPnlPct === "number") {
      rows.push(`- Günlük portföy P&L: %${p.totalPnlPct.toFixed(2)}`);
    }
    if (typeof p.totalValueTl === "number") {
      rows.push(`- Toplam portföy değeri: ${p.totalValueTl.toLocaleString("tr-TR")} TL`);
    }
    if (p.worstPosition) {
      rows.push(
        `- En kötü pozisyon: ${p.worstPosition.symbol} (%${p.worstPosition.pnlPct.toFixed(2)})`,
      );
    }
    if (rows.length > 0) parts.push(`PORTFÖY DURUMU:\n${rows.join("\n")}`);
  }

  switch (ctx.scenario) {
    case "panic":
      parts.push(
        `SENARYO: Kullanıcının portföyü sert düştü, panik yaşıyor olabilir.
GÖREV:
1) Hissini meşrulaştır ("bu his normal").
2) BIST tarihsel verisine atıfla sakinleştir (spesifik rakam verme, genel).
3) 4-7-8 nefes egzersizi öner.
4) "Şu an karar verme, önce nefes al" de.
5) Asla "al", "sat", "tut" deme.`,
      );
      break;

    case "fomo":
      parts.push(
        `SENARYO: Kullanıcı sert yükselen bir hisseye FOMO ile girmek üzere.
GÖREV:
1) Sakin ve direkt ol — "dostum sakin, durup düşün" de.
2) Zirve yakınında alım riskini hatırlat.
3) Kaçırılan fırsatın her zaman yeni fırsatlarla döndüğünü söyle.
4) Kararı kendisinin verdiğini hatırlat.`,
      );
      break;

    case "journal_review":
      parts.push(
        `SENARYO: Trade journal verisi üzerinden kullanıcının deseni analiz ediliyor.
GÖREV: Tekrarlayan hataları yumuşak ama net şekilde yüzüne vur. Hangi pattern'ı değiştirmesi gerektiğini söyle.`,
      );
      break;

    case "realistic_expectation":
      parts.push(
        `SENARYO: Kullanıcı gerçekçi olmayan bir hedef yazdı ("2 ayda 2x" gibi).
GÖREV: Nazikçe ama net şekilde gerçekçi beklenti çerçevesini hatırlat (yıllık %25-40 gerçekçi hedef). Hayal kırmadan, ama yanıltmadan konuş.`,
      );
      break;

    case "stop_loss_miss":
      parts.push(
        `SENARYO: Kullanıcı stop-loss seviyesini geçmesine rağmen pozisyonu kapatmadı.
GÖREV: Disiplin vurgusu yap. "Kendi koyduğun kurala uymak, kuralı hiç koymamaktan daha önemli" mesajı ver.`,
      );
      break;

    case "scam_check":
      parts.push(
        `SENARYO: Kullanıcı bir URL, Telegram/WhatsApp grubu, X hesabı, YouTube kanalı veya "VIP sinyal" tavsiyesini sana gönderdi ve "bu güvenilir mi, scam mi?" diye soruyor.
GÖREV:
1) Türkiye finans scam örüntülerini tara: ücretsiz sinyal → ödeme dönüşü, "kesin kazandırıyor" vaadi, sahte ekran görüntüleri, "sadece bugün" aciliyet baskısı, SPK lisansı olmadan danışmanlık, crypto pump/dump grupları.
2) "Bu hesap %X scam riski taşıyor" tarzı net bir sonuç ver (düşük/orta/yüksek risk).
3) Kırmızı bayrakları madde madde listele (max 4 madde).
4) Kendi başına tespit edemediğin şey varsa "bilmiyorum, kontrol etmem gerekir" de — uydurma.
5) SPK lisanslı olmayan herhangi bir birinin "al bunu" demesinin suç olduğunu hatırlat.
6) Son cümle: "Şüphen varsa, uzak dur. Fırsat kaçırdığını düşündüğün şey büyük ihtimalle tuzaktır."`,
      );
      break;

    default:
      parts.push(`SENARYO: Serbest sohbet. Kullanıcı ne sorarsa samimi ve kısa cevapla.`);
  }

  return parts.join("\n\n");
}

// CORS — farklı domain'den çağrı olasılığına karşı
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Vercel Edge Runtime: process.env global olarak mevcut
  // @ts-expect-error — Edge runtime process.env'i destekler, tip tanımı bazı versiyonlarda eksik olabilir
  const ANTHROPIC_API_KEY: string | undefined = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY yapılandırılmamış" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { messages?: ChatMessage[]; context?: CoachContext };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages, context = {} } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages dizisi zorunlu" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 4000),
  }));

  const systemPrompt = `${CORE_PERSONA}\n\n---\n\n${buildScenarioPrompt(context)}`;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 700,
      temperature: 0.7,
      system: systemPrompt,
      messages: trimmed,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text();
    console.error("Anthropic error:", upstream.status, errText);
    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({ error: "Dostum biraz yavaşla, bir dakika bekle." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: "Koç şu an meşgul, birazdan tekrar dene." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Anthropic SSE → düz text stream dönüştür (Eğitmen ile aynı protokol)
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Send, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const TOPICS = [
  "Sık yapılan hatalar",
  "Pozisyon büyüklüğü",
  "Stop-loss stratejisi",
  "Breakout vs stop avı",
  "Overtrading",
  "Sektör rotasyonu",
  "Risk/Ödül oranı",
  "Revenge trading",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "**Hoş geldiniz** 👋\n\nMerhaba! Ben Borsa Eğitmeni'yim — teknik analiz, risk yönetimi, portföy stratejisi ve yatırımcı psikolojisi konularında eğitim veriyorum.\n\nYukarıdaki konu başlıklarından birini seçebilir veya aklınızdaki soruyu doğrudan yazabilirsiniz. Her kavramı gerçek piyasa örnekleriyle açıklayacağım.",
};

interface Props {
  /** When true, renders inside a fixed-height container (for modal/floating). When false, page mode. */
  embedded?: boolean;
}

export function BorsaEgitmeni({ embedded = false }: Props) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const history = [...messages.filter((m) => m !== WELCOME || messages.length > 1), userMsg];
    // Actually, send full history (excluding the welcome assistant message which is UI-only)
    const apiHistory = messages.length === 1 && messages[0] === WELCOME
      ? [userMsg]
      : [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/borsa-egitmeni-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiHistory }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Sunucu hatası" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${err.error || "Bir hata oluştu, lütfen tekrar deneyin."}` },
        ]);
        setIsLoading(false);
        return;
      }

      // Add empty assistant message that we'll fill via streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-lg",
        embedded ? "h-full w-full" : "w-full max-w-3xl mx-auto h-[80vh] max-h-[820px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground leading-tight">Borsa Eğitmeni</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif · Teknik Analiz & Risk Yönetimi
          </p>
        </div>
      </div>

      {/* Topic pills */}
      <div className="flex gap-1.5 flex-wrap px-4 py-2.5 border-b border-border bg-muted/40">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={isLoading}
            onClick={() => send(t)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Sorunuzu yazın... (Enter göndermek için, Shift+Enter yeni satır)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none min-h-[40px] max-h-[120px] px-3.5 py-2.5 border border-border rounded-3xl text-sm bg-muted/40 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
            aria-label="Gönder"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        <p className="text-[11px] text-center mt-1.5 text-muted-foreground">
          Eğitim amaçlıdır · Yatırım tavsiyesi değildir
        </p>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5 max-w-[88%] animate-in fade-in slide-in-from-bottom-1 duration-200", isUser ? "self-end flex-row-reverse" : "self-start")}>
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 self-end",
          isUser ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? "S" : "BE"}
      </div>
      <div
        className={cn(
          "px-3.5 py-2.5 text-sm leading-relaxed border",
          isUser
            ? "bg-primary text-primary-foreground border-primary rounded-[16px_16px_4px_16px]"
            : "bg-muted/60 text-foreground border-border rounded-[4px_16px_16px_16px]"
        )}
      >
        <FormattedContent text={msg.content} />
      </div>
    </div>
  );
}

/** Lightweight markdown: **bold**, line breaks, simple lists */
function FormattedContent({ text }: { text: string }) {
  if (!text) return <span className="text-muted-foreground italic">...</span>;

  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <div key={i}>{renderInline(line)}</div>
      ))}
    </div>
  );
}

function renderInline(line: string) {
  // Split by **bold** markers
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 self-start">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-medium">
        BE
      </div>
      <div className="flex gap-1 items-center px-4 py-3 bg-muted/60 border border-border rounded-[4px_16px_16px_16px]">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "180ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "360ms" }} />
      </div>
    </div>
  );
}

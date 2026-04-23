import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BreathingOrb } from "./BreathingOrb";
import type { CoachPortfolioContext } from "@/lib/coach/types";

interface Props {
  open: boolean;
  portfolio: CoachPortfolioContext | null;
  onClose: () => void;
  onContinueToCoach: () => void;
}

/**
 * Panik modu — portföy -%5 altındayken otomatik açılır.
 * Koç'tan tek-atış (non-streaming) bir mesaj çeker, nefes egzersizi gösterir.
 * "Koç'la konuş" → PanicModal kapanır, Koç tab'inde seed ile chat açılır.
 */
export function PanicModal({ open, portfolio, onClose, onContinueToCoach }: Props) {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !portfolio) return;
    setLoading(true);
    setError(null);
    setMessage("");

    const ctrl = new AbortController();

    const run = async () => {
      try {
        const pnl = portfolio.totalPnlPct?.toFixed(2) ?? "?";
        const resp = await fetch("/api/coach-chat", {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Portföyüm bugün %${pnl} düştü. İçimden satmak geçiyor. Ne yapayım?`,
              },
            ],
            context: { scenario: "panic", portfolio },
          }),
        });

        if (!resp.ok || !resp.body) {
          const err = await resp.json().catch(() => ({ error: "Sunucu hatası" }));
          throw new Error(err.error || "Koç meşgul");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessage(acc);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Hata");
        }
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => ctrl.abort();
  }, [open, portfolio]);

  if (!portfolio) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <Compass className="w-3.5 h-3.5" />
          Koç
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Dostum, bir saniye dur.</h2>
        <p className="text-sm text-muted-foreground -mt-3">
          Portföyün bugün{" "}
          <span className="font-semibold text-destructive">
            %{portfolio.totalPnlPct?.toFixed(2)}
          </span>{" "}
          düştü.
          {portfolio.worstPosition && (
            <>
              {" "}En kötü:{" "}
              <span className="font-mono text-foreground">{portfolio.worstPosition.symbol}</span>{" "}
              (%{portfolio.worstPosition.pnlPct.toFixed(2)}).
            </>
          )}
        </p>

        <BreathingOrb />

        <div className="min-h-[96px] rounded-lg border border-border bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground">
          {loading && !message && <span className="text-muted-foreground italic">Koç yazıyor…</span>}
          {error && <span className="text-destructive">{error}</span>}
          {message && <p className="whitespace-pre-wrap">{message}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Nefes aldım, devam
          </Button>
          <Button className="flex-1" onClick={onContinueToCoach}>
            Koç&apos;la konuşayım
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

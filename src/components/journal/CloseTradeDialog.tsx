import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TradeEntry, TradeReason } from "@/lib/journal/types";

interface Props {
  trade: TradeEntry;
  onClose: () => void;
  onSubmit: (patch: Partial<TradeEntry>) => void;
}

const CLOSE_REASONS: Array<{ key: TradeReason; label: string }> = [
  { key: "take_profit_hit", label: "Target'a vardı" },
  { key: "stop_loss_hit", label: "Stop vurdu" },
  { key: "panic_sell", label: "Panik sattım" },
  { key: "ignored_stop_loss", label: "Stop'a uymadım" },
];

export function CloseTradeDialog({ trade, onClose, onSubmit }: Props) {
  const [exitPrice, setExitPrice] = useState("");
  const [reasons, setReasons] = useState<TradeReason[]>([]);

  function toggleReason(key: TradeReason) {
    setReasons((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exitPrice) return;
    const combined = Array.from(new Set([...(trade.reasons ?? []), ...reasons]));
    onSubmit({
      status: "closed",
      exitPrice: parseFloat(exitPrice),
      exitDate: new Date().toISOString(),
      reasons: combined,
    });
  }

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{trade.symbol} pozisyonunu kapat</h3>
            <p className="text-xs text-muted-foreground">
              Giriş: {trade.entryPrice} × {trade.quantity} ({trade.side === "long" ? "alış" : "açığa"})
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-exit" className="text-xs">
              Çıkış fiyatı
            </Label>
            <Input
              id="j-exit"
              type="number"
              step="0.01"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nasıl kapattın?</Label>
            <div className="flex flex-wrap gap-1.5">
              {CLOSE_REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleReason(r.key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    reasons.includes(r.key)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="flex-1">
              Kapat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

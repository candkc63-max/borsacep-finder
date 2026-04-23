import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TradeEntry, TradeReason, TradeSide } from "@/lib/journal/types";

interface Props {
  onAdd: (trade: Omit<TradeEntry, "id">) => void;
  onCancel: () => void;
}

const REASON_OPTIONS: Array<{ key: TradeReason; label: string }> = [
  { key: "analysis", label: "Kendi analizim" },
  { key: "technical", label: "Teknik kurulum" },
  { key: "news", label: "Haber" },
  { key: "fomo", label: "FOMO" },
  { key: "tip", label: "Tavsiye/guru" },
  { key: "revenge_trade", label: "İntikam işlemi" },
];

export function AddTradeForm({ onAdd, onCancel }: Props) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<TradeSide>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [commissionPct, setCommissionPct] = useState("0.2");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<TradeReason[]>([]);

  function toggleReason(key: TradeReason) {
    setReasons((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim() || !entryPrice || !quantity) return;

    onAdd({
      symbol: symbol.trim().toUpperCase(),
      side,
      status: "open",
      entryPrice: parseFloat(entryPrice),
      quantity: parseFloat(quantity),
      entryDate: new Date(entryDate).toISOString(),
      plannedStopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      plannedTakeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      commissionRate: parseFloat(commissionPct) / 100,
      note: note.trim() || undefined,
      reasons: reasons.length > 0 ? reasons : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">Yeni işlem ekle</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="j-symbol" className="text-xs">Sembol</Label>
          <Input
            id="j-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="THYAO"
            className="uppercase"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Yön</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={side === "long" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSide("long")}
            >
              Alış
            </Button>
            <Button
              type="button"
              variant={side === "short" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setSide("short")}
            >
              Açığa
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="j-price" className="text-xs">Giriş fiyatı</Label>
          <Input
            id="j-price"
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-qty" className="text-xs">Adet</Label>
          <Input
            id="j-qty"
            type="number"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="j-stop" className="text-xs">
            Planlı stop-loss <span className="text-muted-foreground">(opsiyonel)</span>
          </Label>
          <Input
            id="j-stop"
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-tp" className="text-xs">
            Planlı kar al <span className="text-muted-foreground">(opsiyonel)</span>
          </Label>
          <Input
            id="j-tp"
            type="number"
            step="0.01"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="j-date" className="text-xs">Tarih</Label>
          <Input
            id="j-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-comm" className="text-xs">Komisyon %</Label>
          <Input
            id="j-comm"
            type="number"
            step="0.01"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Neden aldın? (birden fazla seçebilirsin)</Label>
        <div className="flex flex-wrap gap-1.5">
          {REASON_OPTIONS.map((r) => (
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

      <div className="space-y-1.5">
        <Label htmlFor="j-note" className="text-xs">
          Not <span className="text-muted-foreground">(opsiyonel)</span>
        </Label>
        <Textarea
          id="j-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Neden bu pozisyonu aldın?"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" className="flex-1">
          Ekle
        </Button>
      </div>
    </form>
  );
}

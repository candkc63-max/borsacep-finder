import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AlertKind, AlertRule } from "@/lib/alerts/types";

interface Props {
  onSubmit: (rule: Omit<AlertRule, "id" | "createdAt" | "status">) => void;
  onCancel: () => void;
}

const KIND_OPTIONS: Array<{ key: AlertKind; label: string; desc: string }> = [
  { key: "fomo", label: "FOMO", desc: "Referanstan %X yukarı uçarsa" },
  { key: "price_above", label: "Fiyat üstü", desc: "Belirli seviyeye ulaşırsa" },
  { key: "price_below", label: "Fiyat altı", desc: "Belirli seviyenin altına düşerse" },
];

export function CreateAlertForm({ onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<AlertKind>("fomo");
  const [symbol, setSymbol] = useState("");
  const [threshold, setThreshold] = useState("");
  const [pctThreshold, setPctThreshold] = useState("30");
  const [referencePrice, setReferencePrice] = useState("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) return;
    const base = {
      kind,
      symbol: symbol.trim().toUpperCase(),
      note: note.trim() || undefined,
    };

    if (kind === "fomo") {
      if (!referencePrice || !pctThreshold) return;
      onSubmit({
        ...base,
        pctThreshold: parseFloat(pctThreshold),
        referencePrice: parseFloat(referencePrice),
      });
      return;
    }

    if (!threshold) return;
    onSubmit({ ...base, threshold: parseFloat(threshold) });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">Yeni alarm</h3>

      <div className="space-y-1.5">
        <Label className="text-xs">Tür</Label>
        <div className="flex flex-wrap gap-1.5">
          {KIND_OPTIONS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                kind === k.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted",
              )}
              title={k.desc}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a-symbol" className="text-xs">
          Sembol
        </Label>
        <Input
          id="a-symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="THYAO, ASELS…"
          className="uppercase"
          required
        />
      </div>

      {kind === "fomo" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-ref" className="text-xs">
              Referans fiyat
            </Label>
            <Input
              id="a-ref"
              type="number"
              step="0.01"
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-pct" className="text-xs">
              Yükseliş (%)
            </Label>
            <Input
              id="a-pct"
              type="number"
              step="1"
              value={pctThreshold}
              onChange={(e) => setPctThreshold(e.target.value)}
              required
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="a-th" className="text-xs">
            Eşik fiyat
          </Label>
          <Input
            id="a-th"
            type="number"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="a-note" className="text-xs">
          Not <span className="text-muted-foreground">(opsiyonel)</span>
        </Label>
        <Input
          id="a-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" className="flex-1">
          Kur
        </Button>
      </div>
    </form>
  );
}

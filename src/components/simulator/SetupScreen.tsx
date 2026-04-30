import { useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onStart: (args: { symbol: string; from: string; capital: number }) => void;
  loading?: boolean;
  error?: string | null;
}

const POPULAR_SYMBOLS = [
  "THYAO", "GARAN", "AKBNK", "ASELS", "EREGL", "BIMAS", "KCHOL", "SAHOL",
  "TUPRS", "YKBNK", "ISCTR", "VAKBN", "PGSUS", "TOASO", "FROTO", "SISE",
];

export function SetupScreen({ onStart, loading, error }: Props) {
  const [symbol, setSymbol] = useState("THYAO");
  const [from, setFrom] = useState("2010-01-01");
  const [capital, setCapital] = useState("100000");

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <PlayCircle className="h-6 w-6 text-primary" />
            Bar Replay Simülasyonu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Geçmişe dön, mum mum ilerle, kâğıt para ile pratik yap. Sonunda Koç performansını yorumlasın.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Hisse</Label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="THYAO"
            className="uppercase font-mono"
          />
          <div className="flex flex-wrap gap-1">
            {POPULAR_SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Başlangıç tarihi</Label>
            <Input
              type="date"
              value={from}
              min="2000-01-01"
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setFrom(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Tarih kadar geriye gidemez ise mevcut en eski tarih kullanılır.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Başlangıç sermayesi (₺)</Label>
            <Input
              type="number"
              min="1000"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-bearish bg-bearish/10 p-3 text-xs text-bearish">
            {error}
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={loading || !symbol.trim()}
          onClick={() =>
            onStart({
              symbol: symbol.trim().toUpperCase(),
              from,
              capital: parseFloat(capital) || 100000,
            })
          }
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Veri yükleniyor...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" /> Simülasyonu Başlat
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          ⓘ Veri Yahoo Finance üzerinden çekilir. Bazı hisseler için 2000'den daha geriye veri olmayabilir.
        </p>
      </div>
    </div>
  );
}

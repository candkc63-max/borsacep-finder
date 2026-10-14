import { memo } from "react";
import type { StrategyResult, Signal } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, Star } from "lucide-react";

const signalConfig: Record<Signal, { label: string; className: string; rail: string; icon: React.ReactNode }> = {
  "AL": { label: "AL", className: "bg-bullish/10 text-bullish border-bullish/40", rail: "bg-bullish", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  "SAT": { label: "SAT", className: "bg-bearish/10 text-bearish border-bearish/40", rail: "bg-bearish", icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  "NÖTR": { label: "NÖTR", className: "bg-muted text-muted-foreground border-border", rail: "bg-muted-foreground/40", icon: <Minus className="w-3.5 h-3.5" /> },
};

interface StockTableProps {
  results: StrategyResult[];
  filter: Signal | "ALL" | "FAV";
  onStockClick?: (symbol: string) => void;
  isFavorite?: (symbol: string) => boolean;
  toggleFavorite?: (symbol: string) => void;
}

const StockRow = memo(function StockRow({
  result,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  result: StrategyResult;
  onClick?: (symbol: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (symbol: string) => void;
}) {
  const sc = signalConfig[result.signal];
  return (
    <tr onClick={() => onClick?.(result.symbol)} className="group cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/[0.04]">
      <td className="relative p-3 font-mono font-bold text-foreground">
        <span className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", sc.rail)} />
        <div className="flex items-center gap-2 pl-2">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(result.symbol); }}
              className="transition-transform hover:scale-110"
              aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
            >
              <Star className={cn("h-4 w-4", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400")} />
            </button>
          )}
          <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-[10px] text-muted-foreground">
            {result.symbol.slice(0, 2)}
          </span>
          {result.symbol}
        </div>
      </td>
      <td className="p-3 text-muted-foreground">{result.name}</td>
      <td className="p-3 text-right font-mono font-semibold text-foreground">
        ₺{result.price.toFixed(2)}
      </td>
      <td className={cn("p-3 text-right font-mono font-semibold", result.change >= 0 ? "text-bullish" : "text-bearish")}>
        {result.change >= 0 ? "+" : ""}{result.change.toFixed(2)}%
      </td>
      <td className="p-3 text-center">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold", sc.className)}>
          {sc.icon}
          {sc.label}
        </span>
      </td>
      <td className="hidden p-3 lg:table-cell">
        <div className="flex flex-wrap gap-2">
          {Object.entries(result.indicators).map(([key, val]) => (
            <span key={key} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {key}: {val ? `₺${val.toFixed(2)}` : "—"}
            </span>
          ))}
        </div>
      </td>
      <td className="hidden max-w-xs p-3 text-xs text-muted-foreground md:table-cell">{result.details}</td>
    </tr>
  );
});

export function StockTable({ results, filter, onStockClick, isFavorite, toggleFavorite }: StockTableProps) {
  const filtered = filter === "ALL" ? results : filter === "FAV" ? results.filter(r => isFavorite?.(r.symbol)) : results.filter(r => r.signal === filter);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="max-h-[min(72vh,920px)] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-card/95 backdrop-blur">
            <tr className="border-b border-border">
              <th className="p-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Sembol</th>
              <th className="p-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Şirket</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Fiyat</th>
              <th className="p-3 text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Değişim</th>
              <th className="p-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Sinyal</th>
              <th className="hidden p-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground lg:table-cell">İndikatörler</th>
              <th className="hidden p-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:table-cell">Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <StockRow
                key={r.symbol}
                result={r}
                onClick={onStockClick}
                isFavorite={isFavorite?.(r.symbol)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="px-6 py-16 text-center">
          <p className="font-semibold text-foreground">Bu masada hisse yok</p>
          <p className="mt-1 text-sm text-muted-foreground">Filtreyi gevşet veya başka bir strateji dene.</p>
        </div>
      )}
    </div>
  );
}

import { memo } from "react";
import type { StrategyResult, Signal } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, Star } from "lucide-react";

const signalConfig: Record<Signal, { label: string; className: string; icon: React.ReactNode }> = {
  "AL": { label: "AL", className: "bg-bullish/10 text-bullish border-bullish", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  "SAT": { label: "SAT", className: "bg-bearish/10 text-bearish border-bearish", icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  "NÖTR": { label: "NÖTR", className: "bg-muted text-muted-foreground border-border", icon: <Minus className="w-3.5 h-3.5" /> },
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
    <tr onClick={() => onClick?.(result.symbol)} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="p-3 font-mono font-bold text-foreground">
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(result.symbol); }}
              className="hover:scale-110 transition-transform"
              aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
            >
              <Star className={cn("w-4 h-4", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400")} />
            </button>
          )}
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
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border", sc.className)}>
          {sc.icon}
          {sc.label}
        </span>
      </td>
      <td className="p-3 hidden lg:table-cell">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(result.indicators).map(([key, val]) => (
            <span key={key} className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {key}: {val ? `₺${val.toFixed(2)}` : "—"}
            </span>
          ))}
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">{result.details}</td>
    </tr>
  );
});

export function StockTable({ results, filter, onStockClick, isFavorite, toggleFavorite }: StockTableProps) {
  const filtered = filter === "ALL" ? results : filter === "FAV" ? results.filter(r => isFavorite?.(r.symbol)) : results.filter(r => r.signal === filter);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Sembol</th>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Şirket</th>
              <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Fiyat</th>
              <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Değişim</th>
              <th className="text-center p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Sinyal</th>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">İndikatörler</th>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Açıklama</th>
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
        <div className="p-12 text-center text-muted-foreground">
          Bu filtreye uygun hisse bulunamadı.
        </div>
      )}
    </div>
  );
}

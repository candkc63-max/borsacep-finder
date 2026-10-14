import type { StrategyResult, Signal } from "@/lib/indicators";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalSummaryProps {
  results: StrategyResult[];
  active?: Signal | "ALL" | "FAV";
  onSelect?: (signal: Signal) => void;
}

export function SignalSummary({ results, active, onSelect }: SignalSummaryProps) {
  const al = results.filter(r => r.signal === "AL").length;
  const sat = results.filter(r => r.signal === "SAT").length;
  const notr = results.filter(r => r.signal === "NÖTR").length;
  const total = Math.max(results.length, 1);
  const alShare = Math.round((al / total) * 100);

  const cards: { key: Signal; label: string; value: number; hint: string; icon: React.ReactNode; tone: string }[] = [
    { key: "AL", label: "AL", value: al, hint: "alış tarafı", icon: <TrendingUp className="h-4 w-4" />, tone: "text-bullish" },
    { key: "SAT", label: "SAT", value: sat, hint: "satış tarafı", icon: <TrendingDown className="h-4 w-4" />, tone: "text-bearish" },
    { key: "NÖTR", label: "NÖTR", value: notr, hint: "bekle", icon: <Minus className="h-4 w-4" />, tone: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => {
          const selected = active === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect?.(card.key)}
              className={cn(
                "rounded-xl border bg-background/70 p-3 text-left transition-all",
                selected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40",
              )}
            >
              <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", card.tone)}>
                {card.icon}
                {card.label}
              </div>
              <p className={cn("mt-2 font-mono text-2xl font-bold leading-none", card.tone)}>{card.value}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{card.hint}</p>
            </button>
          );
        })}
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Alış payı</span>
          <span>%{results.length ? alShare : 0}</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-bullish" style={{ width: `${(al / total) * 100}%` }} />
          <div className="bg-bearish" style={{ width: `${(sat / total) * 100}%` }} />
          <div className="bg-neutral-signal/70" style={{ width: `${(notr / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

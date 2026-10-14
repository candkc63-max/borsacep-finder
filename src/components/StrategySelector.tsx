import type { Strategy, StrategyId } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, Zap, Shield, ArrowDownUp } from "lucide-react";

const icons: Record<StrategyId, React.ReactNode> = {
  ema5_22: <TrendingUp className="w-4 h-4" />,
  ema9_sma20: <BarChart3 className="w-4 h-4" />,
  fib_5_8_13: <Zap className="w-4 h-4" />,
  trend_50_200: <Shield className="w-4 h-4" />,
  pullback: <ArrowDownUp className="w-4 h-4" />,
};

interface StrategySelectorProps {
  selected: StrategyId;
  onSelect: (id: StrategyId) => void;
  strategies: Strategy[];
  layout?: "grid" | "rail";
}

export function StrategySelector({ selected, onSelect, strategies, layout = "grid" }: StrategySelectorProps) {
  if (layout === "rail") {
    return (
      <div className="space-y-1.5">
        {strategies.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                active
                  ? "border-primary/70 bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]"
                  : "border-transparent bg-background/40 hover:border-border hover:bg-muted/40",
              )}
            >
              <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {icons[s.id]}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{s.description}</span>
                <span className={cn("mt-1.5 inline-block font-mono text-[10px] uppercase tracking-wider", active ? "text-primary" : "text-muted-foreground/80")}>
                  {s.style}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {strategies.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "relative rounded-xl border p-4 text-left transition-all duration-200",
            "hover:border-primary/50 hover:glow-green",
            selected === s.id
              ? "border-primary bg-primary/10 glow-green"
              : "border-border bg-card"
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("transition-colors", selected === s.id ? "text-primary" : "text-muted-foreground")}>
              {icons[s.id]}
            </span>
            <span className={cn(
              "rounded px-2 py-0.5 font-mono text-xs",
              selected === s.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {s.style}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
        </button>
      ))}
    </div>
  );
}

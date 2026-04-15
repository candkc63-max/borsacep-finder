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
}

export function StrategySelector({ selected, onSelect, strategies }: StrategySelectorProps) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {strategies.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "relative p-4 rounded-lg border text-left transition-all duration-200",
            "hover:border-primary/50 hover:glow-green",
            selected === s.id
              ? "border-primary bg-primary/10 glow-green"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "transition-colors",
              selected === s.id ? "text-primary" : "text-muted-foreground"
            )}>
              {icons[s.id]}
            </span>
            <span className={cn(
              "text-xs font-mono px-2 py-0.5 rounded",
              selected === s.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {s.style}
            </span>
          </div>
          <h3 className="font-semibold text-sm text-foreground">{s.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
        </button>
      ))}
    </div>
  );
}

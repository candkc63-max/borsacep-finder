import { cn } from "@/lib/utils";
import type { ChartIndicatorToggle } from "./SimChart";

interface Props {
  value: ChartIndicatorToggle;
  onChange: (next: ChartIndicatorToggle) => void;
}

const ITEMS: Array<{ key: keyof ChartIndicatorToggle; label: string; color: string }> = [
  { key: "ema20", label: "EMA 20", color: "bg-amber-400" },
  { key: "ema50", label: "EMA 50", color: "bg-blue-500" },
  { key: "ema200", label: "EMA 200", color: "bg-purple-500" },
  { key: "sma50", label: "SMA 50", color: "bg-cyan-500" },
  { key: "bollinger", label: "Bollinger", color: "bg-purple-400" },
  { key: "vwap", label: "VWAP", color: "bg-orange-500" },
];

export function IndicatorToggles({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ITEMS.map((it) => {
        const active = value[it.key];
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange({ ...value, [it.key]: !active })}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors",
              active
                ? "bg-card text-foreground border border-border"
                : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", active ? it.color : "bg-muted-foreground/40")} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

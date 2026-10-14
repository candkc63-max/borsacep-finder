import type { StrategyResult } from "@/lib/indicators";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface SignalSummaryProps {
  results: StrategyResult[];
}

export function SignalSummary({ results }: SignalSummaryProps) {
  const al = results.filter(r => r.signal === "AL").length;
  const sat = results.filter(r => r.signal === "SAT").length;
  const notr = results.filter(r => r.signal === "NÖTR").length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-bullish/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-bullish" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-bullish">{al}</p>
          <p className="text-xs text-muted-foreground">AL Sinyali</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-bearish/10 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-bearish" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-bearish">{sat}</p>
          <p className="text-xs text-muted-foreground">SAT Sinyali</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-muted-foreground">{notr}</p>
          <p className="text-xs text-muted-foreground">NÖTR</p>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { stocks } from "@/lib/stockData";
import { applyStrategy, type StrategyId, type Signal } from "@/lib/indicators";
import { StrategySelector } from "@/components/StrategySelector";
import { StockTable } from "@/components/StockTable";
import { SignalSummary } from "@/components/SignalSummary";
import { cn } from "@/lib/utils";
import { Activity, Filter } from "lucide-react";

const signalFilters: { value: Signal | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "AL", label: "AL" },
  { value: "SAT", label: "SAT" },
  { value: "NÖTR", label: "NÖTR" },
];

const Index = () => {
  const [strategy, setStrategy] = useState<StrategyId>("ema5_22");
  const [signalFilter, setSignalFilter] = useState<Signal | "ALL">("ALL");

  const results = useMemo(() => {
    return stocks.map(s => applyStrategy(s.symbol, s.name, s.prices, strategy));
  }, [strategy]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">BORSACEP</h1>
              <p className="text-xs text-muted-foreground font-mono">.COM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bullish animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">BIST100 • Canlı Tarama</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Strategy Selector */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Strateji Seçin
          </h2>
          <StrategySelector selected={strategy} onSelect={(id) => { setStrategy(id); setSignalFilter("ALL"); }} />
        </section>

        {/* Summary */}
        <SignalSummary results={results} />

        {/* Signal Filter + Table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Tarama Sonuçları ({signalFilter === "ALL" ? results.length : results.filter(r => r.signal === signalFilter).length} hisse)
            </h2>
            <div className="flex gap-1">
              {signalFilters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSignalFilter(f.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors",
                    signalFilter === f.value
                      ? f.value === "AL" ? "bg-bullish/10 text-bullish border border-bullish"
                        : f.value === "SAT" ? "bg-bearish/10 text-bearish border border-bearish"
                        : "bg-primary/10 text-primary border border-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <StockTable results={results} filter={signalFilter} />
        </section>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center py-4 font-mono">
          ⚠ Bu veriler simülasyon amaçlıdır. Yatırım tavsiyesi değildir.
        </p>
      </main>
    </div>
  );
};

export default Index;

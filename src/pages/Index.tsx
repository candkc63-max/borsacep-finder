import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { stocks as mockStocks } from "@/lib/stockData";
import { useBistStocks } from "@/hooks/useBistStocks";
import { useAuth } from "@/hooks/useAuth";
import { applyStrategy, type StrategyId, type Signal } from "@/lib/indicators";
import { StrategySelector } from "@/components/StrategySelector";
import { StockTable } from "@/components/StockTable";
import { SignalSummary } from "@/components/SignalSummary";
import { StockDetailModal } from "@/components/StockDetailModal";
import { StockSearch } from "@/components/StockSearch";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity, Filter, Wifi, WifiOff, Loader2, LogIn, LogOut, User } from "lucide-react";

const signalFilters: { value: Signal | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "AL", label: "AL" },
  { value: "SAT", label: "SAT" },
  { value: "NÖTR", label: "NÖTR" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [strategy, setStrategy] = useState<StrategyId>("ema5_22");
  const [signalFilter, setSignalFilter] = useState<Signal | "ALL">("ALL");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: liveStocks, isLoading, isError } = useBistStocks();
  
  // Use live data if available, fall back to mock
  const stockData = liveStocks ?? mockStocks;
  const isLive = !!liveStocks;

  const results = useMemo(() => {
    const all = stockData.map(s => applyStrategy(s.symbol, s.name, s.prices, strategy));
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(r => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [strategy, stockData, searchQuery]);

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
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  <span className="text-xs font-mono text-muted-foreground">Yükleniyor...</span>
                </>
              ) : isLive ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-bullish" />
                  <span className="text-xs font-mono text-muted-foreground">Canlı</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-bearish" />
                  <span className="text-xs font-mono text-muted-foreground">Simülasyon</span>
                </>
              )}
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline truncate max-w-[120px]">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut} className="h-8 px-2">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="h-8 gap-1.5 font-semibold">
                <LogIn className="w-4 h-4" />
                Üye Ol
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isError && (
          <div className="rounded-lg border border-bearish bg-bearish/10 p-4 text-sm text-bearish">
            ⚠ Canlı veri alınamadı. Simülasyon verileri gösteriliyor.
          </div>
        )}

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

        {/* Search + Signal Filter + Table */}
        <section>
          <div className="mb-3">
            <StockSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
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
          <StockTable results={results} filter={signalFilter} onStockClick={setSelectedSymbol} />
        </section>

      </main>

      <Footer />

      <StockDetailModal
        open={!!selectedSymbol}
        onOpenChange={(open) => !open && setSelectedSymbol(null)}
        stock={selectedSymbol ? stockData.find(s => s.symbol === selectedSymbol) ?? null : null}
        currentStrategy={strategy}
      />
    </div>
  );
};

export default Index;

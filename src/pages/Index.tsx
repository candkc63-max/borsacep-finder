import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { stocks as mockStocks } from "@/lib/stockData";
import { useBistStocks } from "@/hooks/useBistStocks";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useTheme } from "@/hooks/useTheme";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNotifications } from "@/hooks/useNotifications";
import { applyStrategy, strategies, type StrategyId, type Signal, type Timeframe } from "@/lib/indicators";
import { StrategySelector } from "@/components/StrategySelector";
import { StockTable } from "@/components/StockTable";
import { SignalSummary } from "@/components/SignalSummary";
import { StockDetailModal } from "@/components/StockDetailModal";
import { StockSearch } from "@/components/StockSearch";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { QuickFilters, type Preset } from "@/components/QuickFilters";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSector, type Sector } from "@/lib/sectors";
import { Activity, Filter, Wifi, WifiOff, Loader2, LogIn, LogOut, RefreshCw, Star, Sun, Moon, Bell, BellOff, Briefcase, Clock } from "lucide-react";

const signalFilters: { value: Signal | "ALL" | "FAV"; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "AL", label: "AL" },
  { value: "SAT", label: "SAT" },
  { value: "NÖTR", label: "NÖTR" },
  { value: "FAV", label: "Favoriler" },
];

const timeframeFilters: { value: Timeframe | "all"; label: string }[] = [
  { value: "all", label: "Tüm Vadeler" },
  { value: "kisa", label: "Kısa Vade" },
  { value: "orta", label: "Orta Vade" },
  { value: "uzun", label: "Uzun Vade" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const { portfolio, addToPortfolio, removeFromPortfolio } = usePortfolio();
  const { enabled: notifEnabled, toggleNotifications, sendNotification } = useNotifications();
  const [showPortfolio, setShowPortfolio] = useState(false);

  const [strategy, setStrategy] = useState<StrategyId>(() => {
    try {
      const saved = localStorage.getItem("borsacep-strategy");
      return (saved && strategies.some(s => s.id === saved)) ? saved as StrategyId : "ema5_22";
    } catch { return "ema5_22"; }
  });
  const [signalFilter, setSignalFilter] = useState<Signal | "ALL" | "FAV">(() => {
    try {
      const saved = localStorage.getItem("borsacep-signal-filter");
      return (saved === "AL" || saved === "SAT" || saved === "NÖTR" || saved === "ALL" || saved === "FAV") ? saved : "ALL";
    } catch { return "ALL"; }
  });
  const [timeframeFilter, setTimeframeFilter] = useState<Timeframe | "all">("all");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { try { localStorage.setItem("borsacep-strategy", strategy); } catch {} }, [strategy]);
  useEffect(() => { try { localStorage.setItem("borsacep-signal-filter", signalFilter); } catch {} }, [signalFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: liveStocks, isLoading, isError, refetch } = useBistStocks();

  const stockData = liveStocks ?? mockStocks;
  const isLive = !!liveStocks;

  // Filter strategies by timeframe
  const filteredStrategies = useMemo(() => {
    if (timeframeFilter === "all") return strategies;
    return strategies.filter(s => s.timeframe === timeframeFilter);
  }, [timeframeFilter]);

  // Auto-select first strategy of filtered timeframe
  useEffect(() => {
    if (filteredStrategies.length > 0 && !filteredStrategies.some(s => s.id === strategy)) {
      setStrategy(filteredStrategies[0].id);
    }
  }, [filteredStrategies, strategy]);

  const results = useMemo(() => {
    const all = stockData.map(s => applyStrategy(s.symbol, s.name, s.prices, strategy));
    if (!debouncedSearch.trim()) return all;
    const q = debouncedSearch.toLowerCase();
    return all.filter(r => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [strategy, stockData, debouncedSearch]);

  // Notification: alert when new AL signals appear
  const prevAlCountRef = useRef<number | null>(null);
  useEffect(() => {
    const alCount = results.filter(r => r.signal === "AL").length;
    if (prevAlCountRef.current !== null && alCount > prevAlCountRef.current) {
      const diff = alCount - prevAlCountRef.current;
      sendNotification("BORSACEP - Yeni AL Sinyali!", `${diff} yeni hissede AL sinyali tespit edildi.`);
    }
    prevAlCountRef.current = alCount;
  }, [results, sendNotification]);

  const filteredCount = signalFilter === "ALL" ? results.length : signalFilter === "FAV" ? results.filter(r => isFavorite(r.symbol)).length : results.filter(r => r.signal === signalFilter).length;

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
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-2 mr-2">
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
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0" title="Verileri yenile">
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0" title={theme === "dark" ? "Aydınlık tema" : "Karanlık tema"}>
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleNotifications} className="h-8 w-8 p-0" title={notifEnabled ? "Bildirimleri kapat" : "Bildirimleri aç"}>
              {notifEnabled ? <Bell className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPortfolio(!showPortfolio)} className={cn("h-8 w-8 p-0", showPortfolio && "bg-primary/10")} title="Portföy">
              <Briefcase className="w-3.5 h-3.5" />
            </Button>
            {user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline truncate max-w-[100px]">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut} className="h-8 px-2">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="h-8 gap-1.5 font-semibold ml-1">
                <LogIn className="w-4 h-4" />
                Üye Ol
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isError && (
          <div className="rounded-lg border border-bearish bg-bearish/10 p-4 text-sm text-bearish flex items-center justify-between">
            <span>Canlı veri alınamadı. Simülasyon verileri gösteriliyor.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-bearish text-bearish hover:bg-bearish/20">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Tekrar Dene
            </Button>
          </div>
        )}

        {/* Portfolio Panel */}
        {showPortfolio && (
          <PortfolioPanel
            portfolio={portfolio}
            stockData={stockData}
            onRemove={removeFromPortfolio}
          />
        )}

        {/* Timeframe Filter */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Vade Seçin
          </h2>
          <div className="flex gap-2 flex-wrap">
            {timeframeFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setTimeframeFilter(f.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  timeframeFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Strategy Selector */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Strateji Seçin
          </h2>
          <StrategySelector selected={strategy} onSelect={(id) => { setStrategy(id); setSignalFilter("ALL"); }} strategies={filteredStrategies} />
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
              Tarama Sonuçları ({filteredCount} hisse)
            </h2>
            <div className="flex gap-1 flex-wrap">
              {signalFilters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSignalFilter(f.value)}
                  aria-label={`${f.label} filtresi`}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors",
                    signalFilter === f.value
                      ? f.value === "AL" ? "bg-bullish/10 text-bullish border border-bullish"
                        : f.value === "SAT" ? "bg-bearish/10 text-bearish border border-bearish"
                        : f.value === "FAV" ? "bg-yellow-400/10 text-yellow-500 border border-yellow-400"
                        : "bg-primary/10 text-primary border border-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.value === "FAV" ? <Star className="w-3 h-3 inline-block mr-1" /> : null}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading && !liveStocks ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-4 w-16 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-20 bg-muted rounded ml-auto" />
                    <div className="h-6 w-14 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StockTable
              results={results}
              filter={signalFilter}
              onStockClick={setSelectedSymbol}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          )}
        </section>
      </main>

      <Footer />

      <StockDetailModal
        open={!!selectedSymbol}
        onOpenChange={(open) => !open && setSelectedSymbol(null)}
        stock={selectedSymbol ? stockData.find(s => s.symbol === selectedSymbol) ?? null : null}
        currentStrategy={strategy}
        onAddToPortfolio={addToPortfolio}
      />
    </div>
  );
};

export default Index;

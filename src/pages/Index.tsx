import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { stocks as mockStocks } from "@/lib/stockData";
import { useBistStocks } from "@/hooks/useBistStocks";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useTheme } from "@/hooks/useTheme";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNotifications } from "@/hooks/useNotifications";
import {
  applyStrategy, strategies, calcRSI, detectEmaCross, detectMacdCross,
  detectBollingerState, isVolumeSpike, calcMACD,
  sma200BreakUp, sma200BreakDown, priceAboveSma, priceBelowSma,
  recentGoldenCross, recentDeathCross, is52WeekHighBreak,
  rsiOversoldBouncing, strongMomentum,
  type StrategyId, type Signal, type Timeframe,
} from "@/lib/indicators";
import { StrategySelector } from "@/components/StrategySelector";
import { StockTable } from "@/components/StockTable";
import { SignalSummary } from "@/components/SignalSummary";
import { StockDetailModal } from "@/components/StockDetailModal";
import { StockSearch } from "@/components/StockSearch";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { QuickFilters, type Preset } from "@/components/QuickFilters";
import { AdvancedFilters, emptyAdvancedFilters, type AdvancedFilterState } from "@/components/AdvancedFilters";
import { Footer } from "@/components/Footer";
import { EgitmenFloatingButton } from "@/components/EgitmenFloatingButton";
import { PanicModal } from "@/components/coach/PanicModal";
import { summarizePortfolio } from "@/lib/coach/portfolioSummary";
import type { CoachScenario } from "@/lib/coach/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSector, type Sector } from "@/lib/sectors";
import { isInIndex } from "@/lib/indices";
import { getFundamentals, getMarketCapBucket, matchPe, matchDiv } from "@/lib/fundamentals";
import { Activity, Filter, Wifi, WifiOff, Loader2, LogIn, LogOut, RefreshCw, Star, Sun, Moon, Bell, BellOff, Briefcase, Clock, BookOpen, BellRing, ShieldAlert, Globe, Sparkles, PlayCircle, Rewind } from "lucide-react";
import { JournalDialog } from "@/components/journal/JournalDialog";
import { AlertCenter } from "@/components/alerts/AlertCenter";
import { ScamCheckDialog } from "@/components/coach/ScamCheckDialog";
import { FeedbackButton } from "@/components/FeedbackButton";
import { OnboardingDialog } from "@/components/coach/OnboardingDialog";
import { MacroRiskDialog } from "@/components/coach/MacroRiskDialog";
import { StressModeBanner } from "@/components/coach/StressModeBanner";
import { PortfolioDiagnosticCard, buildPortfolioSeed } from "@/components/coach/PortfolioDiagnosticCard";
import { useStressMonitor } from "@/lib/coach/stressMonitor";
import { diagnosePortfolio } from "@/lib/coach/portfolioDiagnostic";
import { readProfile } from "@/lib/coach/onboarding";
import { buildStockSummaryForCoach } from "@/lib/coach/chartSummary";
import { useAlertMonitor, type TriggeredAlert } from "@/lib/alerts/monitor";
import { useAutoAlertsFromJournal } from "@/lib/alerts/autoFromJournal";
import { coachScenarioForAlert } from "@/lib/alerts/engine";
import type { AlertKind } from "@/lib/alerts/types";
import { toast } from "sonner";

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
  const [journalOpen, setJournalOpen] = useState(false);
  const [alertCenterOpen, setAlertCenterOpen] = useState(false);
  const [scamCheckOpen, setScamCheckOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [macroOpen, setMacroOpen] = useState(false);

  // Stres modu izleyici (#14) — detay modalı açıldığında artış
  const stress = useStressMonitor();

  // Acemi onboarding — ilk ziyarette otomatik aç
  useEffect(() => {
    if (!readProfile()) {
      const timer = setTimeout(() => setOnboardingOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Simülasyon sayfasından gelen Koç değerlendirme isteği
  useEffect(() => {
    try {
      const seed = sessionStorage.getItem("borsacep-sim-coach-seed");
      if (seed) {
        sessionStorage.removeItem("borsacep-sim-coach-seed");
        setCoachSeed({
          text: seed,
          scenario: "journal_review",
          key: `sim-${Date.now()}`,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);
  const [panicOpen, setPanicOpen] = useState(false);
  const [coachSeed, setCoachSeed] = useState<{
    text: string;
    scenario: CoachScenario;
    key: string;
  } | null>(null);

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
  const [onlyBuy, setOnlyBuy] = useState(false);
  const [onlySell, setOnlySell] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<Sector | "ALL">("ALL");
  const [preset, setPreset] = useState<Preset>(null);
  const [advFilters, setAdvFilters] = useState<AdvancedFilterState>(emptyAdvancedFilters);

  useEffect(() => { try { localStorage.setItem("borsacep-strategy", strategy); } catch {} }, [strategy]);
  useEffect(() => { try { localStorage.setItem("borsacep-signal-filter", signalFilter); } catch {} }, [signalFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: liveStocks, isLoading, isError, refetch } = useBistStocks();

  const stockData = liveStocks ?? mockStocks;
  const isLive = !!liveStocks;

  // Koç için portföy özeti — panik modu + koç context'i
  const portfolioSummary = useMemo(
    () => summarizePortfolio(portfolio, stockData.map((s) => ({ symbol: s.symbol, prices: s.prices }))),
    [portfolio, stockData],
  );

  // Panik tetiği — portföy -%5'in altına düşerse (24 saat snooze)
  useEffect(() => {
    if (!portfolioSummary || typeof portfolioSummary.totalPnlPct !== "number") return;
    if (portfolioSummary.totalPnlPct > -5) return;

    const SNOOZE_KEY = "borsacep-panic-snooze-until";
    const until = parseInt(localStorage.getItem(SNOOZE_KEY) || "0", 10);
    if (Date.now() < until) return;

    setPanicOpen(true);
  }, [portfolioSummary]);

  const closePanic = () => {
    setPanicOpen(false);
    localStorage.setItem("borsacep-panic-snooze-until", String(Date.now() + 24 * 60 * 60 * 1000));
  };

  const handleContinueToCoachFromPanic = () => {
    closePanic();
    const pnl = portfolioSummary?.totalPnlPct?.toFixed(2) ?? "?";
    setCoachSeed({
      text: `Portföyüm %${pnl} düştü, sattım mı satmadım mı kararsızım. Beni konuştur.`,
      scenario: "panic",
      key: `panic-${Date.now()}`,
    });
  };

  // Journal → otomatik alarm üretimi
  useAutoAlertsFromJournal();

  // Alarm monitörü — stockData her güncellendiğinde armed alarmları değerlendir
  const handleAlertTrigger = (t: TriggeredAlert) => {
    const KIND_META: Record<AlertKind, { icon: string; title: string }> = {
      fomo: { icon: "🚀", title: "FOMO Alarmı" },
      stop_loss: { icon: "🛑", title: "Stop-Loss Vurdu" },
      take_profit: { icon: "🎯", title: "Kar Al Hedefi" },
      price_above: { icon: "📈", title: "Fiyat Üstü" },
      price_below: { icon: "📉", title: "Fiyat Altı" },
    };
    const meta = KIND_META[t.alert.kind];
    toast(`${meta.icon} ${meta.title} · ${t.alert.symbol}`, {
      description: t.reason,
      duration: 15000,
      action: {
        label: "Koç'a sor",
        onClick: () => {
          setCoachSeed({
            text: buildAlertSeed(t),
            scenario: coachScenarioForAlert(t.alert),
            key: `alert-${t.alert.id}-${t.triggeredAt}`,
          });
        },
      },
    });
  };
  const { armedCount } = useAlertMonitor(stockData, handleAlertTrigger);

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
    let all = stockData.map(s => applyStrategy(s.symbol, s.name, s.prices, strategy));

    // Arama
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      all = all.filter(r => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }

    // Sektör
    if (sectorFilter !== "ALL") {
      all = all.filter(r => getSector(r.symbol) === sectorFilter);
    }

    // Hızlı toggle'lar
    if (onlyBuy) all = all.filter(r => r.signal === "AL");
    if (onlySell) all = all.filter(r => r.signal === "SAT");
    if (onlyFavorites) all = all.filter(r => isFavorite(r.symbol));

    // Preset'ler
    if (preset === "strong_buy") {
      all = all.filter(r => r.signal === "AL" && r.change >= 2);
    } else if (preset === "dip") {
      all = all.filter(r => r.signal === "AL" && r.change <= -2);
    } else if (preset === "momentum") {
      all = all.filter(r => {
        if (r.signal !== "AL") return false;
        const stock = stockData.find(s => s.symbol === r.symbol);
        if (!stock || stock.prices.length < 4) return false;
        // prices[0] = bugün (en yeni). Ardışık 3 gün yükseliş = p0>p1>p2>p3
        return stock.prices[0] > stock.prices[1] && stock.prices[1] > stock.prices[2] && stock.prices[2] > stock.prices[3];
      });
    }

    // Gelişmiş filtreler (RSI / MACD / EMA cross / Bollinger / Hacim)
    const hasAdv = Object.values(advFilters).some(Boolean);
    if (hasAdv) {
      all = all.filter(r => {
        const stock = stockData.find(s => s.symbol === r.symbol);
        if (!stock) return false;
        const prices = stock.prices;

        if (advFilters.rsi) {
          const rsi = calcRSI(prices);
          if (rsi == null) return false;
          if (advFilters.rsi === "oversold" && !(rsi < 30)) return false;
          if (advFilters.rsi === "overbought" && !(rsi > 70)) return false;
          if (advFilters.rsi === "neutral" && !(rsi >= 30 && rsi <= 70)) return false;
        }

        if (advFilters.macd) {
          if (advFilters.macd === "bullish_cross" || advFilters.macd === "bearish_cross") {
            if (detectMacdCross(prices) !== advFilters.macd) return false;
          } else {
            const m = calcMACD(prices);
            if (!m) return false;
            if (advFilters.macd === "positive" && !(m.histogram > 0)) return false;
            if (advFilters.macd === "negative" && !(m.histogram < 0)) return false;
          }
        }

        if (advFilters.emaCross) {
          if (detectEmaCross(prices, 5, 22) !== advFilters.emaCross) return false;
        }

        if (advFilters.bollinger) {
          if (detectBollingerState(prices) !== advFilters.bollinger) return false;
        }

        if (advFilters.volume === "spike") {
          if (!isVolumeSpike(stock.volumes, 2, 20)) return false;
        }

        if (advFilters.index) {
          if (!isInIndex(r.symbol, advFilters.index)) return false;
        }

        if (advFilters.marketCap || advFilters.pe || advFilters.div) {
          const f = getFundamentals(r.symbol);
          if (advFilters.marketCap && getMarketCapBucket(f.marketCap) !== advFilters.marketCap) return false;
          if (advFilters.pe && !matchPe(f.pe, advFilters.pe)) return false;
          if (advFilters.div && !matchDiv(f.divYield, advFilters.div)) return false;
        }

        // Fiyat / SMA pozisyonu
        if (advFilters.smaPosition) {
          switch (advFilters.smaPosition) {
            case "break_up_200":
              if (!sma200BreakUp(prices)) return false;
              break;
            case "break_down_200":
              if (!sma200BreakDown(prices)) return false;
              break;
            case "above_50":
              if (!priceAboveSma(prices, 50)) return false;
              break;
            case "below_50":
              if (!priceBelowSma(prices, 50)) return false;
              break;
            case "above_200":
              if (!priceAboveSma(prices, 200)) return false;
              break;
            case "below_200":
              if (!priceBelowSma(prices, 200)) return false;
              break;
          }
        }

        // Büyük trend kesişimi (50/200)
        if (advFilters.majorCross) {
          if (advFilters.majorCross === "golden_50_200" && !recentGoldenCross(prices, 50, 200, 10)) return false;
          if (advFilters.majorCross === "death_50_200" && !recentDeathCross(prices, 50, 200, 10)) return false;
        }

        // Özel kurulumlar
        if (advFilters.setup) {
          if (advFilters.setup === "52w_high_break" && !is52WeekHighBreak(prices)) return false;
          if (advFilters.setup === "rsi_oversold_bounce" && !rsiOversoldBouncing(prices)) return false;
          if (advFilters.setup === "strong_momentum" && !strongMomentum(prices)) return false;
        }

        return true;
      });
    }

    return all;
  }, [strategy, stockData, debouncedSearch, sectorFilter, onlyBuy, onlySell, onlyFavorites, isFavorite, preset, advFilters]);

  // Notification: alert when new AL signals appear
  const prevAlCountRef = useRef<number | null>(null);
  useEffect(() => {
    const alCount = results.filter(r => r.signal === "AL").length;
    if (prevAlCountRef.current !== null && alCount > prevAlCountRef.current) {
      const diff = alCount - prevAlCountRef.current;
      sendNotification("BORSA101 - Yeni AL Sinyali!", `${diff} yeni hissede AL sinyali tespit edildi.`);
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
              <h1 className="text-lg font-bold text-foreground tracking-tight">BORSA101</h1>
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
            <Button variant="ghost" size="sm" onClick={() => setJournalOpen(true)} className="h-8 w-8 p-0" title="Trade Journal">
              <BookOpen className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAlertCenterOpen(true)} className="h-8 w-8 p-0 relative" title="Alarmlar">
              <BellRing className="w-3.5 h-3.5" />
              {armedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {armedCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setScamCheckOpen(true)} className="h-8 w-8 p-0" title="Scam / Guru kontrolü">
              <ShieldAlert className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMacroOpen(true)} className="h-8 w-8 p-0" title="Makro Risk Paneli">
              <Globe className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOnboardingOpen(true)} className="h-8 w-8 p-0" title="Risk Profili">
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/videolar")} className="h-8 w-8 p-0" title="Video Kütüphanesi">
              <PlayCircle className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/simulasyon")} className="h-8 w-8 p-0" title="Bar Replay Simülasyonu">
              <Rewind className="w-3.5 h-3.5" />
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

        {/* Portfolio Panel + Dağılım Analizi */}
        {showPortfolio && (
          <div className="space-y-3">
            <PortfolioPanel
              portfolio={portfolio}
              stockData={stockData}
              onRemove={removeFromPortfolio}
            />
            {(() => {
              const priceMap = Object.fromEntries(
                stockData.map((s) => [s.symbol, s.prices[0] ?? 0]),
              ) as Record<string, number>;
              const diag = diagnosePortfolio(portfolio, priceMap);
              if (!diag) return null;
              return (
                <PortfolioDiagnosticCard
                  diagnostic={diag}
                  onAskCoach={() =>
                    setCoachSeed({
                      text: buildPortfolioSeed(diag),
                      scenario: "chat",
                      key: `portfolio-${Date.now()}`,
                    })
                  }
                />
              );
            })()}
          </div>
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

        {/* Stres Modu uyarı banner'ı */}
        <StressModeBanner
          stress={stress}
          onAskCoach={() =>
            setCoachSeed({
              text: `Dostum bugün ${stress.checks} kez portföyümü / hisse detayını açtım. Kafam dağınık, fazla kontrol ediyorum. Panik modunda olabilir miyim? Beni sakinleştir.`,
              scenario: "panic",
              key: `stress-${Date.now()}`,
            })
          }
        />

        {/* Strategy Selector */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Strateji Seçin
          </h2>
          <StrategySelector selected={strategy} onSelect={(id) => { setStrategy(id); setSignalFilter("ALL"); }} strategies={filteredStrategies} />
        </section>

        {/* Quick Filters: presets + AL/SAT/Favoriler + Sektör */}
        <QuickFilters
          onlyBuy={onlyBuy}
          onlySell={onlySell}
          onlyFavorites={onlyFavorites}
          sector={sectorFilter}
          preset={preset}
          onToggleBuy={() => { setOnlyBuy(v => !v); if (!onlyBuy) setOnlySell(false); }}
          onToggleSell={() => { setOnlySell(v => !v); if (!onlySell) setOnlyBuy(false); }}
          onToggleFavorites={() => setOnlyFavorites(v => !v)}
          onSectorChange={setSectorFilter}
          onPresetChange={setPreset}
        />

        {/* Advanced Filters: RSI / MACD / EMA / Bollinger / Volume */}
        <AdvancedFilters value={advFilters} onChange={setAdvFilters} />

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
              onStockClick={(sym) => { stress.recordCheck(); setSelectedSymbol(sym); }}
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
        onAskCoach={(s) => {
          setSelectedSymbol(null);
          setCoachSeed({
            text: buildStockSummaryForCoach(s),
            scenario: "chat",
            key: `chart-${s.symbol}-${Date.now()}`,
          });
        }}
      />

      <EgitmenFloatingButton
        portfolioContext={portfolioSummary ?? undefined}
        coachSeed={coachSeed}
        onCoachSeedConsumed={() => setCoachSeed(null)}
      />

      <PanicModal
        open={panicOpen}
        portfolio={portfolioSummary}
        onClose={closePanic}
        onContinueToCoach={handleContinueToCoachFromPanic}
      />

      <JournalDialog
        open={journalOpen}
        onOpenChange={setJournalOpen}
        onRequestCoachReview={(summary) =>
          setCoachSeed({
            text: summary,
            scenario: "journal_review",
            key: `journal-${Date.now()}`,
          })
        }
      />

      <AlertCenter open={alertCenterOpen} onOpenChange={setAlertCenterOpen} />

      <ScamCheckDialog
        open={scamCheckOpen}
        onOpenChange={setScamCheckOpen}
        onAnalyze={(text) =>
          setCoachSeed({
            text,
            scenario: "scam_check",
            key: `scam-${Date.now()}`,
          })
        }
      />

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />

      <MacroRiskDialog
        open={macroOpen}
        onOpenChange={setMacroOpen}
        onAskCoach={(text) =>
          setCoachSeed({
            text,
            scenario: "chat",
            key: `macro-${Date.now()}`,
          })
        }
      />

      <FeedbackButton />
    </div>
  );
};

function buildAlertSeed(t: TriggeredAlert): string {
  const lines: string[] = [];
  const kindLabel: Record<AlertKind, string> = {
    fomo: "FOMO alarmı",
    stop_loss: "stop-loss alarmı",
    take_profit: "kar al alarmı",
    price_above: "fiyat üstü alarmı",
    price_below: "fiyat altı alarmı",
  };
  lines.push(`${kindLabel[t.alert.kind]} tetiklendi:`);
  lines.push(`- Sembol: ${t.alert.symbol}`);
  lines.push(`- Şu anki fiyat: ${t.price}`);
  if (t.alert.threshold !== undefined) lines.push(`- Eşik: ${t.alert.threshold}`);
  if (t.alert.kind === "fomo" && t.alert.referencePrice !== undefined) {
    lines.push(`- Referans fiyat: ${t.alert.referencePrice}`);
    lines.push(`- Eşik yükseliş: %${t.alert.pctThreshold}`);
  }
  lines.push("");
  if (t.alert.kind === "fomo") {
    lines.push("Dostum, bir an önce atlamak istesem de — zirve riski var. Bana kısa ve net konuş:");
    lines.push("1) Burada FOMO tuzağı neyi tetikliyor olabilir?");
    lines.push("2) Bir sonraki fırsatın her zaman geleceğini hatırlat.");
    lines.push("3) Al/sat deme; kararı bana bırak.");
  } else if (t.alert.kind === "stop_loss") {
    lines.push("Stop seviyem vuruldu. İçimden pozisyonu tutup toparlanmasını beklemek geçiyor.");
    lines.push("Kendi koyduğum kurala uymanın neden önemli olduğunu net şekilde hatırlat.");
    lines.push("Al/sat deme — sadece disiplin üzerine konuş.");
  } else if (t.alert.kind === "take_profit") {
    lines.push("Kar al seviyeme vardım. İçimden biraz daha beklemek geçiyor.");
    lines.push("Açgözlülük tuzağını hatırlat ama baskı kurma. Karar bende.");
  } else {
    lines.push("Bu seviye geldi. Duygusal bir tuzak var mı, ne diyorsun?");
  }
  return lines.join("\n");
}

export default Index;

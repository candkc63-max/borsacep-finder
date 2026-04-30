import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/Footer";
import {
  IndicatorToggles,
} from "@/components/simulator/IndicatorToggles";
import { ReplayControls } from "@/components/simulator/ReplayControls";
import { SetupScreen } from "@/components/simulator/SetupScreen";
import { SimChart, type ChartIndicatorToggle } from "@/components/simulator/SimChart";
import { TradePanel } from "@/components/simulator/TradePanel";
import { supabase } from "@/lib/backend";
import {
  calcOpenPnl,
  calcRealizedPnl,
  checkStopAndTargets,
  closePosition,
  openPosition,
} from "@/lib/simulator/engine";
import {
  COMMISSION_DEFAULT,
  type HistoryCandle,
  type HistoryResponse,
  type SimPosition,
} from "@/lib/simulator/types";

const PLAN_KEY_PREFIX = "borsacep-sim-plan-v1-";

const Simulasyon = () => {
  // Setup
  const [candles, setCandles] = useState<HistoryCandle[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sim state
  const [currentBarIdx, setCurrentBarIdx] = useState(0);
  const [positions, setPositions] = useState<SimPosition[]>([]);
  const [capital, setCapital] = useState(100000);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(500);
  const [plan, setPlan] = useState("");

  // Indicators
  const [indicators, setIndicators] = useState<ChartIndicatorToggle>({
    ema20: true,
    ema50: true,
    ema200: false,
    sma50: false,
    bollinger: false,
    vwap: false,
  });

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Plan localStorage
  useEffect(() => {
    if (!symbol) return;
    try {
      const saved = localStorage.getItem(PLAN_KEY_PREFIX + symbol);
      if (saved) setPlan(saved);
    } catch {
      /* ignore */
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    try {
      localStorage.setItem(PLAN_KEY_PREFIX + symbol, plan);
    } catch {
      /* ignore */
    }
  }, [plan, symbol]);

  const startSim = async (args: { symbol: string; from: string; capital: number }) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bist-history?symbol=${encodeURIComponent(
        args.symbol,
      )}&from=${args.from}`;

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      } else {
        headers["Authorization"] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Veri alınamadı");
      }
      const data = (await res.json()) as HistoryResponse;
      if (data.note) {
        toast.info(data.note);
      }

      setCandles(data.candles);
      setSymbol(args.symbol);
      setCapital(args.capital);
      setInitialCapital(args.capital);
      setPositions([]);
      // İlk 30 mumu visible olarak başla — kullanıcı boş chart yerine bağlam görsün
      setCurrentBarIdx(Math.min(30, data.candles.length - 1));
      setIsPlaying(false);
    } catch (e: any) {
      setError(e?.message || "Bilinmeyen hata");
      toast.error(e?.message || "Veri alınamadı");
    } finally {
      setLoading(false);
    }
  };

  // Auto-play
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      return;
    }
    if (currentBarIdx >= candles.length - 1) {
      setIsPlaying(false);
      return;
    }
    playTimerRef.current = setTimeout(() => {
      stepForward();
    }, speedMs);
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentBarIdx, speedMs]);

  const stepForward = useCallback(() => {
    setCurrentBarIdx((idx) => {
      const next = Math.min(candles.length - 1, idx + 1);
      // Stop/target tetik kontrolü
      if (next > idx) {
        const candle = candles[next];
        setPositions((prev) => {
          const r = checkStopAndTargets(prev, candle, next, COMMISSION_DEFAULT);
          if (r.closedNow.length > 0) {
            // Realize edilen P&L'i sermayeye ekle
            setCapital((cap) => cap + r.closedNow.reduce((s, p) => s + (p.netPnl ?? 0), 0));
            for (const p of r.closedNow) {
              const reasonLabel =
                p.exitReason === "stop_loss" ? "🛑 Stop vurdu" : "🎯 Target'a vardı";
              toast(`${reasonLabel}: ${p.side === "long" ? "Alış" : "Açığa"} ${p.quantity} adet`, {
                description: `Net P&L: ₺${(p.netPnl ?? 0).toFixed(2)}`,
              });
            }
          }
          return r.positions;
        });
      }
      return next;
    });
  }, [candles]);

  const stepDelta = (delta: number) => {
    if (delta > 0) {
      stepForward();
    } else {
      setCurrentBarIdx((idx) => Math.max(0, idx + delta));
    }
  };

  const jumpTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(candles.length - 1, idx));
    setCurrentBarIdx(clamped);
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentBarIdx(Math.min(30, candles.length - 1));
    setPositions([]);
    setCapital(initialCapital);
  };

  const handleOpen = (args: {
    side: "long" | "short";
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (candles.length === 0) return;
    const cur = candles[currentBarIdx];
    const cost = cur.c * args.quantity;
    const commission = cost * COMMISSION_DEFAULT * 1.05; // BSMV dahil yaklaşık
    if (capital < cost + commission) {
      toast.error("Yetersiz sermaye");
      return;
    }
    setCapital((c) => c - commission); // sadece komisyon düş, ana parayı pozisyon tutar
    const pos = openPosition({
      side: args.side,
      barIdx: currentBarIdx,
      price: cur.c,
      quantity: args.quantity,
      stopLoss: args.stopLoss,
      takeProfit: args.takeProfit,
    });
    setPositions((prev) => [...prev, pos]);
    toast.success(`${args.side === "long" ? "Alış" : "Açığa"}: ${args.quantity}@${cur.c.toFixed(2)}`);
  };

  const handleClose = (positionId: string) => {
    if (candles.length === 0) return;
    const cur = candles[currentBarIdx];
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== positionId || p.status !== "open") return p;
        const closed = closePosition(p, currentBarIdx, cur.c, "manual", COMMISSION_DEFAULT);
        setCapital((c) => c + (closed.netPnl ?? 0));
        toast(`Pozisyon kapatıldı`, {
          description: `Net: ₺${(closed.netPnl ?? 0).toFixed(2)}`,
        });
        return closed;
      }),
    );
  };

  // Sonuç ekranı
  const isFinished = candles.length > 0 && currentBarIdx >= candles.length - 1;
  const realized = calcRealizedPnl(positions);
  const { totalUnrealized } = calcOpenPnl(
    positions,
    candles[currentBarIdx]?.c ?? 0,
    COMMISSION_DEFAULT,
  );
  const totalEquity = capital + totalUnrealized;
  const totalPnl = totalEquity - initialCapital;
  const totalPnlPct = (totalPnl / initialCapital) * 100;

  const askCoachReview = () => {
    const summary = buildSimSummary({
      symbol,
      candles,
      currentBarIdx,
      positions,
      initialCapital,
      totalEquity,
      realized,
      plan,
    });
    // Sessionstorage üzerinden Index.tsx'in coachSeed'ini set etmek
    // basit yol: query param ile koç paneli aç
    sessionStorage.setItem("borsacep-sim-coach-seed", summary);
    toast.success("Koç sohbete yönlendiriliyor", {
      description: "Anasayfaya gidip 🧭 Koç FAB'ına tıkla",
    });
  };

  // Setup ekranı
  if (candles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto flex-1 px-4 py-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Anasayfaya dön
          </Link>
          <SetupScreen onStart={startSim} loading={loading} error={error} />
        </div>
        <Footer />
      </div>
    );
  }

  // Simülasyon ekranı
  const currentPrice = candles[currentBarIdx]?.c ?? 0;
  const currentDate = candles[currentBarIdx]
    ? new Date(candles[currentBarIdx].t * 1000).toISOString()
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 py-3 max-w-[1400px]">
        {/* Üst bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anasayfa
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold">{symbol}</span>
              <span className="font-mono text-base text-muted-foreground">
                ₺{currentPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCandles([]);
                setSymbol("");
                setPositions([]);
                setIsPlaying(false);
              }}
              className="h-8 text-xs"
            >
              Yeni simülasyon
            </Button>
            <Button
              size="sm"
              onClick={askCoachReview}
              className="h-8 text-xs"
              disabled={positions.length === 0 && !isFinished}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Koç değerlendirsin
            </Button>
          </div>
        </div>

        {/* İndikatör çubuğu */}
        <div className="mb-2">
          <IndicatorToggles value={indicators} onChange={setIndicators} />
        </div>

        {/* 3 sütun: chart / yan paneller */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
          {/* Sol: chart + replay controls */}
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-card p-2 h-[55vh] min-h-[400px]">
              <SimChart
                candles={candles}
                currentBarIdx={currentBarIdx}
                indicators={indicators}
                positions={positions}
              />
            </div>
            <ReplayControls
              totalBars={candles.length}
              currentBarIdx={currentBarIdx}
              isPlaying={isPlaying}
              speedMs={speedMs}
              onJump={jumpTo}
              onStep={stepDelta}
              onPlayPause={() => setIsPlaying((v) => !v)}
              onSpeed={setSpeedMs}
              onReset={reset}
              currentDate={currentDate}
            />
          </div>

          {/* Sağ: trade paneli + plan */}
          <aside className="space-y-3">
            <TradePanel
              currentPrice={currentPrice}
              positions={positions}
              capital={capital}
              initialCapital={initialCapital}
              commissionPct={COMMISSION_DEFAULT}
              onOpen={handleOpen}
              onClose={handleClose}
            />

            {/* İşlem planı */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3 w-3" />
                İşlem Planı
              </div>
              <Textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Hipotezin / kuralların / önceden belirlediğin koşullar..."
                rows={6}
                className="text-xs"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Plan otomatik kaydedilir, simülasyon bittiğinde Koç değerlendirir.
              </p>
            </div>

            {/* Kısayol bilgisi */}
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-[10px] text-muted-foreground space-y-0.5">
              <div><kbd className="rounded bg-background px-1">Space</kbd> oynat/duraklat</div>
              <div><kbd className="rounded bg-background px-1">←</kbd> önceki mum</div>
              <div><kbd className="rounded bg-background px-1">→</kbd> sonraki mum</div>
            </div>
          </aside>
        </div>

        {/* Bittiğinde özet */}
        {isFinished && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold">Simülasyon tamamlandı</h3>
                <p className="text-xs text-muted-foreground">
                  Toplam P&L: <span className={totalPnl >= 0 ? "text-bullish" : "text-bearish"}>
                    {totalPnl >= 0 ? "+" : ""}₺{totalPnl.toFixed(2)} ({totalPnlPct.toFixed(2)}%)
                  </span>
                </p>
              </div>
              <Button onClick={askCoachReview} size="sm">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Koç sonucu yorumlasın
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function buildSimSummary(args: {
  symbol: string;
  candles: HistoryCandle[];
  currentBarIdx: number;
  positions: SimPosition[];
  initialCapital: number;
  totalEquity: number;
  realized: number;
  plan: string;
}): string {
  const lines: string[] = [];
  const startDate = new Date(args.candles[0].t * 1000).toISOString().slice(0, 10);
  const endDate = new Date(args.candles[args.currentBarIdx].t * 1000).toISOString().slice(0, 10);
  const totalPnl = args.totalEquity - args.initialCapital;
  const pct = (totalPnl / args.initialCapital) * 100;

  const closed = args.positions.filter((p) => p.status === "closed");
  const wins = closed.filter((p) => (p.netPnl ?? 0) > 0).length;
  const losses = closed.filter((p) => (p.netPnl ?? 0) <= 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  lines.push(`Bar Replay simülasyonu sonucu — ${args.symbol}, ${startDate} → ${endDate}`);
  lines.push(``);
  lines.push(`- Başlangıç sermayesi: ₺${args.initialCapital.toFixed(2)}`);
  lines.push(`- Bitiş equity: ₺${args.totalEquity.toFixed(2)}`);
  lines.push(`- Net P&L: ₺${totalPnl.toFixed(2)} (${pct.toFixed(2)}%)`);
  lines.push(`- Toplam işlem: ${args.positions.length} (kapalı ${closed.length}, açık ${args.positions.length - closed.length})`);
  if (closed.length > 0) {
    lines.push(`- Win rate: %${winRate.toFixed(0)} (${wins} kazanan, ${losses} kaybeden)`);
  }

  // Kapatma sebepleri
  const stops = closed.filter((p) => p.exitReason === "stop_loss").length;
  const targets = closed.filter((p) => p.exitReason === "take_profit").length;
  const manuals = closed.filter((p) => p.exitReason === "manual").length;
  if (closed.length > 0) {
    lines.push(`- Kapatma: ${stops} stop, ${targets} target, ${manuals} manuel`);
  }

  if (args.plan.trim()) {
    lines.push(``);
    lines.push(`Başlangıçta yazdığım işlem planım:`);
    lines.push(args.plan.trim());
  }

  lines.push(``);
  lines.push(
    `Koç olarak performansımı değerlendir: Disiplinli miydim? Plana uydum mu? Stop'a uydum mu? FOMO ile aldığım var mı? Hangi pattern düzelmeli? Yargılama ama net konuş.`,
  );

  return lines.join("\n");
}

export default Simulasyon;

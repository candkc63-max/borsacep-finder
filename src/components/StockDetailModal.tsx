import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StrategyResult, Signal, StrategyId } from "@/lib/indicators";
import { strategies, applyStrategy, calcRSI, calcMACD, calcBollinger, calcSMA, calcEMA } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, ComposedChart, Area } from "recharts";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TradingViewWidget } from "./TradingViewWidget";

interface StockDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: { symbol: string; name: string; prices: number[] } | null;
  currentStrategy: StrategyId;
  onAddToPortfolio?: (item: { symbol: string; name: string; buyPrice: number; quantity: number }) => void;
}

const signalBadge: Record<Signal, { className: string; icon: React.ReactNode }> = {
  AL: { className: "bg-bullish/10 text-bullish border-bullish", icon: <ArrowUpRight className="w-4 h-4" /> },
  SAT: { className: "bg-bearish/10 text-bearish border-bearish", icon: <ArrowDownRight className="w-4 h-4" /> },
  NÖTR: { className: "bg-muted text-muted-foreground border-border", icon: <Minus className="w-4 h-4" /> },
};

export function StockDetailModal({ open, onOpenChange, stock, currentStrategy, onAddToPortfolio }: StockDetailModalProps) {
  const [portfolioQty, setPortfolioQty] = useState(1);
  const chartData = useMemo(() => {
    if (!stock) return [];
    const last60 = stock.prices.slice(0, 60).reverse();
    return last60.map((p, i) => ({ day: i + 1, price: p }));
  }, [stock]);

  const bollingerData = useMemo(() => {
    if (!stock) return [];
    const last60 = stock.prices.slice(0, 60).reverse();
    return last60.map((p, i) => {
      const remaining = stock.prices.slice(0, 60 - i);
      const bb = calcBollinger(remaining, 20);
      return {
        day: i + 1,
        price: p,
        upper: bb?.upper ?? null,
        middle: bb?.middle ?? null,
        lower: bb?.lower ?? null,
      };
    });
  }, [stock]);

  const macdData = useMemo(() => {
    if (!stock) return [];
    const last30 = stock.prices.slice(0, 30);
    return last30.map((_, i) => {
      const remaining = stock.prices.slice(i);
      const macd = calcMACD(remaining);
      return {
        day: 30 - i,
        macd: macd?.macd ?? 0,
        signal: macd?.signal ?? 0,
        histogram: macd?.histogram ?? 0,
      };
    }).reverse();
  }, [stock]);

  const allResults = useMemo(() => {
    if (!stock) return [];
    return strategies.map(s => ({
      strategy: s,
      result: applyStrategy(stock.symbol, stock.name, stock.prices, s.id),
    }));
  }, [stock]);

  const technicals = useMemo(() => {
    if (!stock) return null;
    const rsi = calcRSI(stock.prices);
    const macd = calcMACD(stock.prices);
    const bb = calcBollinger(stock.prices);
    const sma20 = calcSMA(stock.prices, 20);
    const sma50 = calcSMA(stock.prices, 50);
    const sma200 = calcSMA(stock.prices, 200);
    const ema9 = calcEMA(stock.prices, 9);
    const ema21 = calcEMA(stock.prices, 21);
    return { rsi, macd, bb, sma20, sma50, sma200, ema9, ema21 };
  }, [stock]);

  if (!stock) return null;

  const currentResult = allResults.find(r => r.strategy.id === currentStrategy)?.result;
  const price = stock.prices[0];
  const prevPrice = stock.prices[1];
  const change = ((price - prevPrice) / prevPrice) * 100;

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const padding = (maxPrice - minPrice) * 0.05;

  const rsiLevel = technicals?.rsi;
  const rsiStatus = rsiLevel ? (rsiLevel >= 70 ? "Aşırı Alım" : rsiLevel <= 30 ? "Aşırı Satım" : "Normal") : "—";
  const rsiColor = rsiLevel ? (rsiLevel >= 70 ? "text-bearish" : rsiLevel <= 30 ? "text-bullish" : "text-foreground") : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-mono text-lg text-foreground">{stock.symbol}</div>
              <div className="text-sm font-normal text-muted-foreground">{stock.name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-mono text-lg font-bold text-foreground">₺{price.toFixed(2)}</div>
              <div className={cn("text-sm font-mono font-semibold", change >= 0 ? "text-bullish" : "text-bearish")}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Add to Portfolio */}
        {onAddToPortfolio && (
          <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Adet:</span>
            <input
              type="number"
              min={1}
              value={portfolioQty}
              onChange={e => setPortfolioQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs font-mono text-center bg-background border border-border rounded px-1"
            />
            <Button
              size="sm"
              className="h-7 text-xs ml-auto"
              onClick={() => {
                onAddToPortfolio({ symbol: stock.symbol, name: stock.name, buyPrice: price, quantity: portfolioQty });
                toast.success(`${stock.symbol} portföye eklendi (${portfolioQty} adet)`);
              }}
            >
              Portföye Ekle
            </Button>
          </div>
        )}

        <Tabs defaultValue="tradingview" className="mt-2">
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="tradingview" className="flex-1 font-mono text-xs">TradingView</TabsTrigger>
            <TabsTrigger value="chart" className="flex-1 font-mono text-xs">Grafik</TabsTrigger>
            <TabsTrigger value="technicals" className="flex-1 font-mono text-xs">Teknik</TabsTrigger>
            <TabsTrigger value="signals" className="flex-1 font-mono text-xs">Sinyaller</TabsTrigger>
          </TabsList>

          <TabsContent value="tradingview" className="mt-4">
            <TradingViewWidget symbol={stock.symbol} height={500} />
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">
              Profesyonel grafik · TradingView · Mum, indikatör ve çizim araçları
            </p>
          </TabsContent>

          <TabsContent value="chart" className="mt-4 space-y-4">
            {/* Price Chart with Bollinger Bands */}
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">Fiyat + Bollinger Bantları (60 Gün)</p>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={bollingerData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[minPrice - padding * 2, maxPrice + padding * 2]} tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} tickFormatter={v => `₺${v.toFixed(0)}`} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 14% 18%)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(215 12% 50%)' }}
                    formatter={(value: number, name: string) => [`₺${value.toFixed(2)}`, name === 'price' ? 'Fiyat' : name === 'upper' ? 'Üst Bant' : name === 'lower' ? 'Alt Bant' : 'SMA 20']}
                    labelFormatter={(label) => `Gün ${label}`}
                  />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(215 12% 50%)" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(215 12% 50%)" fillOpacity={0.05} />
                  <Line type="monotone" dataKey="upper" stroke="hsl(215 12% 50%)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="lower" stroke="hsl(215 12% 50%)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="middle" stroke="hsl(38 92% 50%)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="price" stroke="hsl(142 72% 45%)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* MACD Chart */}
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">MACD (12, 26, 9)</p>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={macdData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} width={50} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 14% 18%)', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [value.toFixed(2), name === 'macd' ? 'MACD' : name === 'signal' ? 'Sinyal' : 'Histogram']}
                  />
                  <Bar dataKey="histogram">
                    {macdData.map((entry, i) => (
                      <Cell key={i} fill={entry.histogram >= 0 ? 'hsl(142 72% 45%)' : 'hsl(0 72% 55%)'} fillOpacity={0.6} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="macd" stroke="hsl(142 72% 45%)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="signal" stroke="hsl(0 72% 55%)" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="technicals" className="mt-4 space-y-3">
            {/* RSI */}
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground">RSI (14)</span>
                <span className={cn("text-sm font-mono font-bold", rsiColor)}>
                  {rsiLevel ? rsiLevel.toFixed(1) : "—"} <span className="text-xs font-normal">({rsiStatus})</span>
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full relative">
                  <div className="absolute left-[30%] top-0 bottom-0 w-px bg-muted-foreground/30" />
                  <div className="absolute left-[70%] top-0 bottom-0 w-px bg-muted-foreground/30" />
                  {rsiLevel && (
                    <div
                      className={cn("absolute top-0 h-full w-1.5 rounded-full", rsiLevel >= 70 ? "bg-bearish" : rsiLevel <= 30 ? "bg-bullish" : "bg-primary")}
                      style={{ left: `${Math.min(Math.max(rsiLevel, 0), 100)}%`, transform: 'translateX(-50%)' }}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-bullish">Aşırı Satım (0-30)</span>
                <span className="text-[10px] text-muted-foreground">Normal</span>
                <span className="text-[10px] text-bearish">Aşırı Alım (70-100)</span>
              </div>
            </div>

            {/* MACD Summary */}
            <div className="rounded-lg border border-border bg-background p-4">
              <span className="text-xs font-mono text-muted-foreground">MACD (12, 26, 9)</span>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="text-[10px] text-muted-foreground">MACD</div>
                  <div className="text-sm font-mono font-bold text-foreground">{technicals?.macd?.macd.toFixed(2) ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Sinyal</div>
                  <div className="text-sm font-mono font-bold text-foreground">{technicals?.macd?.signal.toFixed(2) ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Histogram</div>
                  <div className={cn("text-sm font-mono font-bold", (technicals?.macd?.histogram ?? 0) >= 0 ? "text-bullish" : "text-bearish")}>
                    {technicals?.macd?.histogram.toFixed(2) ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bollinger Bands */}
            <div className="rounded-lg border border-border bg-background p-4">
              <span className="text-xs font-mono text-muted-foreground">Bollinger Bantları (20, 2)</span>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="text-[10px] text-muted-foreground">Üst Bant</div>
                  <div className="text-sm font-mono font-bold text-foreground">₺{technicals?.bb?.upper.toFixed(2) ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Orta (SMA 20)</div>
                  <div className="text-sm font-mono font-bold text-foreground">₺{technicals?.bb?.middle.toFixed(2) ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Alt Bant</div>
                  <div className="text-sm font-mono font-bold text-foreground">₺{technicals?.bb?.lower.toFixed(2) ?? "—"}</div>
                </div>
              </div>
              {technicals?.bb && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Fiyat pozisyonu: {price > technicals.bb.upper ? "Üst bantın üzerinde (Aşırı Alım)" : price < technicals.bb.lower ? "Alt bantın altında (Aşırı Satım)" : "Bantlar arasında (Normal)"}
                </div>
              )}
            </div>

            {/* Moving Averages Summary */}
            <div className="rounded-lg border border-border bg-background p-4">
              <span className="text-xs font-mono text-muted-foreground">Hareketli Ortalamalar</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {[
                  { label: "EMA 9", value: technicals?.ema9 },
                  { label: "EMA 21", value: technicals?.ema21 },
                  { label: "SMA 20", value: technicals?.sma20 },
                  { label: "SMA 50", value: technicals?.sma50 },
                  { label: "SMA 200", value: technicals?.sma200 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5">
                    <span className="text-xs font-mono text-muted-foreground">{label}</span>
                    <span className={cn("text-xs font-mono font-bold", value && price > value ? "text-bullish" : value ? "text-bearish" : "text-muted-foreground")}>
                      {value ? `₺${value.toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="signals" className="mt-4 space-y-2">
            {allResults.map(({ strategy, result }) => {
              const badge = signalBadge[result.signal];
              return (
                <div key={strategy.id} className={cn(
                  "rounded-lg border p-3 flex items-center gap-3",
                  strategy.id === currentStrategy ? "border-primary bg-primary/5" : "border-border bg-background"
                )}>
                  <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0", badge.className)}>
                    {badge.icon}
                    {result.signal}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{strategy.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.details || "Sinyal yok"}</div>
                  </div>
                  <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">{strategy.style}</span>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

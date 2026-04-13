import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StrategyResult, Signal, StrategyId } from "@/lib/indicators";
import { strategies, applyStrategy } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useMemo } from "react";

interface StockDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: { symbol: string; name: string; prices: number[] } | null;
  currentStrategy: StrategyId;
}

const signalBadge: Record<Signal, { className: string; icon: React.ReactNode }> = {
  AL: { className: "bg-bullish/10 text-bullish border-bullish", icon: <ArrowUpRight className="w-4 h-4" /> },
  SAT: { className: "bg-bearish/10 text-bearish border-bearish", icon: <ArrowDownRight className="w-4 h-4" /> },
  NÖTR: { className: "bg-muted text-muted-foreground border-border", icon: <Minus className="w-4 h-4" /> },
};

export function StockDetailModal({ open, onOpenChange, stock, currentStrategy }: StockDetailModalProps) {
  const chartData = useMemo(() => {
    if (!stock) return [];
    const last60 = stock.prices.slice(0, 60).reverse();
    return last60.map((p, i) => ({ day: i + 1, price: p }));
  }, [stock]);

  const allResults = useMemo(() => {
    if (!stock) return [];
    return strategies.map(s => ({
      strategy: s,
      result: applyStrategy(stock.symbol, stock.name, stock.prices, s.id),
    }));
  }, [stock]);

  if (!stock) return null;

  const currentResult = allResults.find(r => r.strategy.id === currentStrategy)?.result;
  const price = stock.prices[0];
  const prevPrice = stock.prices[1];
  const change = ((price - prevPrice) / prevPrice) * 100;

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const padding = (maxPrice - minPrice) * 0.05;

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

        <Tabs defaultValue="chart" className="mt-2">
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="chart" className="flex-1 font-mono text-xs">Grafik</TabsTrigger>
            <TabsTrigger value="signals" className="flex-1 font-mono text-xs">Tüm Sinyaller</TabsTrigger>
            <TabsTrigger value="indicators" className="flex-1 font-mono text-xs">İndikatörler</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">Son 60 Gün Fiyat Grafiği</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[minPrice - padding, maxPrice + padding]} tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickLine={false} axisLine={false} tickFormatter={v => `₺${v.toFixed(0)}`} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 14% 18%)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(215 12% 50%)' }}
                    formatter={(value: number) => [`₺${value.toFixed(2)}`, 'Fiyat']}
                    labelFormatter={(label) => `Gün ${label}`}
                  />
                  <Line type="monotone" dataKey="price" stroke="hsl(142 72% 45%)" strokeWidth={2} dot={false} />
                  {currentResult?.indicators && Object.entries(currentResult.indicators).map(([key, val]) => (
                    val && <ReferenceLine key={key} y={val} stroke="hsl(38 92% 50%)" strokeDasharray="4 4" label={{ value: key, position: 'right', fill: 'hsl(38 92% 50%)', fontSize: 10 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
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

          <TabsContent value="indicators" className="mt-4">
            <div className="space-y-3">
              {allResults.map(({ strategy, result }) => (
                <div key={strategy.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="text-xs font-mono text-muted-foreground mb-2">{strategy.name}</div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(result.indicators).map(([key, val]) => (
                      <span key={key} className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">
                        {key}: {val ? `₺${val.toFixed(2)}` : "—"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

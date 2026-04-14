import type { PortfolioItem } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioPanelProps {
  portfolio: PortfolioItem[];
  stockData: { symbol: string; prices: number[] }[];
  onRemove: (symbol: string) => void;
}

export function PortfolioPanel({ portfolio, stockData, onRemove }: PortfolioPanelProps) {
  if (portfolio.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Portföyünüz boş. Hisse detayından portföye ekleyebilirsiniz.</p>
      </div>
    );
  }

  let totalInvested = 0;
  let totalCurrent = 0;

  const items = portfolio.map(item => {
    const stock = stockData.find(s => s.symbol === item.symbol);
    const currentPrice = stock?.prices[0] ?? item.buyPrice;
    const invested = item.buyPrice * item.quantity;
    const current = currentPrice * item.quantity;
    const pnl = current - invested;
    const pnlPct = ((currentPrice - item.buyPrice) / item.buyPrice) * 100;
    totalInvested += invested;
    totalCurrent += current;
    return { ...item, currentPrice, invested, current, pnl, pnlPct };
  });

  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Portföyüm</h3>
          <div className="text-right">
            <div className="text-sm font-mono text-muted-foreground">Toplam Değer: <span className="text-foreground font-bold">₺{totalCurrent.toFixed(2)}</span></div>
            <div className={cn("text-xs font-mono font-semibold", totalPnl >= 0 ? "text-bullish" : "text-bearish")}>
              {totalPnl >= 0 ? "+" : ""}₺{totalPnl.toFixed(2)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {items.map(item => (
          <div key={item.symbol} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.pnl >= 0 ? "bg-bullish/10" : "bg-bearish/10")}>
              {item.pnl >= 0 ? <TrendingUp className="w-4 h-4 text-bullish" /> : <TrendingDown className="w-4 h-4 text-bearish" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-sm text-foreground">{item.symbol}</div>
              <div className="text-xs text-muted-foreground">{item.quantity} adet @ ₺{item.buyPrice.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-semibold text-foreground">₺{item.current.toFixed(2)}</div>
              <div className={cn("text-xs font-mono", item.pnl >= 0 ? "text-bullish" : "text-bearish")}>
                {item.pnl >= 0 ? "+" : ""}{item.pnlPct.toFixed(2)}%
              </div>
            </div>
            <button onClick={() => onRemove(item.symbol)} className="p-1.5 hover:bg-bearish/10 rounded transition-colors" title="Portföyden kaldır">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-bearish" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

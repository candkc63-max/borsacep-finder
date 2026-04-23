import { Button } from "@/components/ui/button";
import { calculateTradeResult, formatPct, formatTl } from "@/lib/journal/calculator";
import { cn } from "@/lib/utils";
import type { TradeEntry } from "@/lib/journal/types";

const REASON_LABEL: Record<string, string> = {
  fomo: "FOMO",
  tip: "tavsiye",
  analysis: "analiz",
  news: "haber",
  technical: "teknik",
  panic_sell: "panik",
  stop_loss_hit: "stop vurdu",
  take_profit_hit: "target",
  ignored_stop_loss: "stop ihlali",
  revenge_trade: "intikam",
};

interface Props {
  trade: TradeEntry;
  onClose: (trade: TradeEntry) => void;
  onDelete: (id: string) => void;
}

export function TradeRow({ trade, onClose, onDelete }: Props) {
  const result = calculateTradeResult(trade);
  const isOpen = trade.status === "open";
  const positive = result ? result.netPnl >= 0 : false;

  return (
    <div className="group rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{trade.symbol}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] uppercase",
                trade.side === "long"
                  ? "bg-bullish/10 text-bullish"
                  : "bg-bearish/10 text-bearish",
              )}
            >
              {trade.side === "long" ? "alış" : "açığa"}
            </span>
            {isOpen && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                açık
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {trade.entryPrice} × {trade.quantity} ·{" "}
            {new Date(trade.entryDate).toLocaleDateString("tr-TR")}
          </div>
          {trade.reasons && trade.reasons.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {trade.reasons.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {REASON_LABEL[r] ?? r}
                </span>
              ))}
            </div>
          )}
          {trade.note && (
            <p className="mt-1.5 text-xs italic text-muted-foreground">
              &ldquo;{trade.note}&rdquo;
            </p>
          )}
        </div>

        <div className="text-right">
          {result ? (
            <>
              <div
                className={cn(
                  "text-sm font-semibold",
                  positive ? "text-bullish" : "text-bearish",
                )}
              >
                {formatTl(result.netPnl)}
              </div>
              <div
                className={cn(
                  "text-xs",
                  positive ? "text-bullish" : "text-bearish",
                )}
              >
                {formatPct(result.netPnlPct)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                komisyon: {formatTl(result.commissionCost + result.bsmvCost)}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">açık</div>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {isOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onClose(trade)}
            className="h-7 text-xs"
          >
            Kapat
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(trade.id)}
          className="h-7 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-bearish group-hover:opacity-100"
        >
          Sil
        </Button>
      </div>
    </div>
  );
}

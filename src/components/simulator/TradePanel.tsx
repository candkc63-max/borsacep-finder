import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcOpenPnl, calcRealizedPnl } from "@/lib/simulator/engine";
import type { SimPosition } from "@/lib/simulator/types";
import { cn } from "@/lib/utils";

interface Props {
  currentPrice: number;
  positions: SimPosition[];
  capital: number;
  initialCapital: number;
  commissionPct: number;
  onOpen: (args: {
    side: "long" | "short";
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  onClose: (positionId: string) => void;
}

export function TradePanel({
  currentPrice,
  positions,
  capital,
  initialCapital,
  commissionPct,
  onOpen,
  onClose,
}: Props) {
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");
  const { totalUnrealized, perPosition } = calcOpenPnl(positions, currentPrice, commissionPct);
  const realized = calcRealizedPnl(positions);
  const totalEquity = capital + totalUnrealized;
  const totalPnl = totalEquity - initialCapital;
  const totalPnlPct = (totalPnl / initialCapital) * 100;

  function handleOpen(side: "long" | "short") {
    const q = parseFloat(quantity);
    if (!q || q <= 0) return;
    onOpen({
      side,
      quantity: q,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
    setQuantity("");
    setStopLoss("");
    setTakeProfit("");
  }

  return (
    <div className="space-y-3">
      {/* Equity özeti */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Toplam Equity
        </div>
        <div
          className={cn(
            "text-2xl font-bold",
            totalPnl >= 0 ? "text-bullish" : "text-bearish",
          )}
        >
          ₺{totalEquity.toFixed(2)}
        </div>
        <div
          className={cn(
            "text-xs font-mono",
            totalPnl >= 0 ? "text-bullish" : "text-bearish",
          )}
        >
          {totalPnl >= 0 ? "+" : ""}₺{totalPnl.toFixed(2)} ({totalPnlPct.toFixed(2)}%)
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
          <div>
            Nakit: <span className="text-foreground">₺{capital.toFixed(2)}</span>
          </div>
          <div>
            Realize: <span className={cn(realized >= 0 ? "text-bullish" : "text-bearish")}>
              ₺{realized.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Yeni işlem aç */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Şu anki fiyat:{" "}
          <span className="font-mono text-foreground">₺{currentPrice.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="sim-qty" className="text-[10px]">
              Adet
            </Label>
            <Input
              id="sim-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sim-stop" className="text-[10px]">
              Stop
            </Label>
            <Input
              id="sim-stop"
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sim-tp" className="text-[10px]">
              Target
            </Label>
            <Input
              id="sim-tp"
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => handleOpen("long")}
            disabled={!quantity}
            className="h-8 bg-bullish hover:bg-bullish/90 text-white text-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Alış
          </Button>
          <Button
            type="button"
            onClick={() => handleOpen("short")}
            disabled={!quantity}
            className="h-8 bg-bearish hover:bg-bearish/90 text-white text-xs"
          >
            <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Açığa Sat
          </Button>
        </div>
      </div>

      {/* Açık pozisyonlar */}
      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          Açık Pozisyonlar ({openPositions.length})
        </div>
        {openPositions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
            Henüz açık pozisyon yok
          </div>
        ) : (
          <div className="space-y-1.5">
            {openPositions.map((p) => {
              const u = perPosition[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className="group flex items-center justify-between rounded-md border border-border bg-card p-2 text-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] uppercase",
                          p.side === "long"
                            ? "bg-bullish/10 text-bullish"
                            : "bg-bearish/10 text-bearish",
                        )}
                      >
                        {p.side === "long" ? "alış" : "açığa"}
                      </span>
                      <span className="font-mono">{p.quantity}@{p.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className={cn("font-mono text-[11px]", u >= 0 ? "text-bullish" : "text-bearish")}>
                      {u >= 0 ? "+" : ""}₺{u.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onClose(p.id)}
                  >
                    Kapat
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kapanmış pozisyonlar */}
      {closedPositions.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Kapanmış Pozisyonlar ({closedPositions.length})
          </summary>
          <div className="mt-2 space-y-1">
            {closedPositions.slice(-10).reverse().map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-muted/40 p-1.5 text-[11px]"
              >
                <span className="font-mono">
                  {p.side === "long" ? "↑" : "↓"} {p.quantity}@{p.entryPrice.toFixed(2)} →{" "}
                  {p.exitPrice?.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "font-mono",
                    (p.netPnl ?? 0) >= 0 ? "text-bullish" : "text-bearish",
                  )}
                >
                  {(p.netPnl ?? 0) >= 0 ? "+" : ""}₺{(p.netPnl ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

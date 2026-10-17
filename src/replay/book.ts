export type Side = "long" | "short";

export type ReplayTrade = {
  id: number;
  side: Side;
  qty: number;
  entryIndex: number;
  entryPrice: number;
  exitIndex: number | null;
  exitPrice: number | null;
};

export function openTrade(trades: ReplayTrade[]): ReplayTrade | null {
  return trades.find((trade) => trade.exitIndex == null) ?? null;
}

export function scrubTrades(trades: ReplayTrade[], cursor: number): ReplayTrade[] {
  return trades.flatMap((trade) => {
    if (trade.entryIndex > cursor) return [];
    if (trade.exitIndex != null && trade.exitIndex > cursor) {
      return [{ ...trade, exitIndex: null, exitPrice: null }];
    }
    return [trade];
  });
}

export function openPosition(trades: ReplayTrade[], side: Side, index: number, price: number, qty: number): ReplayTrade[] {
  if (openTrade(trades) || !(qty > 0) || !Number.isFinite(price)) return trades;
  const id = trades.reduce((max, trade) => Math.max(max, trade.id), 0) + 1;
  return [...trades, { id, side, qty, entryIndex: index, entryPrice: price, exitIndex: null, exitPrice: null }];
}

export function closePosition(trades: ReplayTrade[], index: number, price: number): ReplayTrade[] {
  if (!Number.isFinite(price)) return trades;
  return trades.map((trade) => (
    trade.exitIndex == null ? { ...trade, exitIndex: index, exitPrice: price } : trade
  ));
}

export function tradePnl(trade: ReplayTrade, mark: number): number | null {
  const exit = trade.exitPrice ?? mark;
  if (!Number.isFinite(exit)) return null;
  const diff = trade.side === "long" ? exit - trade.entryPrice : trade.entryPrice - exit;
  return diff * trade.qty;
}

export function realizedPnl(trades: ReplayTrade[]): number {
  return trades.reduce((sum, trade) => {
    if (trade.exitPrice == null) return sum;
    return sum + (tradePnl(trade, trade.exitPrice) ?? 0);
  }, 0);
}

export function unrealizedPnl(trades: ReplayTrade[], mark: number): number {
  const trade = openTrade(trades);
  if (!trade) return 0;
  return tradePnl(trade, mark) ?? 0;
}

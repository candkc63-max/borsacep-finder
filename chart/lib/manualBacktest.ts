export type Side = "long" | "short";

export type ManualOrder = {
  id: string;
  entryCursor: number;
  direction: Side;
  entry: number;
  size: number;
  stop: number;
  target: number;
  manualExit: { cursor: number; price: number } | null;
};

export type PriceBar = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ExitReason = "stop" | "target" | "gap-stop" | "gap-target" | "manual";

export type SimulatedTrade = {
  id: string;
  direction: Side;
  entryCursor: number;
  exitCursor: number | null;
  entry: number;
  exit: number | null;
  size: number;
  stop: number;
  target: number;
  reason: ExitReason | null;
  net: number | null;
  unrealized: number | null;
};

export type TradeMark = {
  entryIndex: number;
  entryPrice: number;
  entryBuy: boolean;
  exitIndex: number | null;
  exitPrice: number | null;
  exitBuy: boolean;
  stop: number | null;
  target: number | null;
};

export type BacktestSnapshot = {
  open: SimulatedTrade[];
  closed: SimulatedTrade[];
  startingCapital: number;
  equity: number;
  realized: number;
  unrealized: number;
  wins: number;
  losses: number;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number | null;
  marks: TradeMark[];
};

export const SAME_BAR_EXIT = "stop-first";

type Fill = { cursor: number; price: number; reason: ExitReason };

function sign(direction: Side) {
  return direction === "long" ? 1 : -1;
}

export function tradeNet(direction: Side, entry: number, exit: number, size: number, rate: number) {
  const gross = (exit - entry) * sign(direction) * size;
  return gross - entry * size * rate - exit * size * rate;
}

export function openNet(direction: Side, entry: number, mark: number, size: number, rate: number) {
  const gross = (mark - entry) * sign(direction) * size;
  return gross - entry * size * rate;
}

export function validateManualOrder(order: Pick<ManualOrder, "direction" | "entry" | "size" | "stop" | "target">, bar: PriceBar): string | null {
  if (!Number.isFinite(order.entry)) return "Giriş fiyatı sayı olmalı.";
  if (!Number.isFinite(order.size) || order.size <= 0) return "Pozisyon büyüklüğü sıfırdan büyük olmalı.";
  if (!Number.isFinite(order.stop)) return "Stop Loss sayı olmalı.";
  if (!Number.isFinite(order.target)) return "Take Profit sayı olmalı.";
  if (order.entry < bar.low || order.entry > bar.high) return "Giriş fiyatı bu mumun en düşük ve en yüksek değeri arasında olmalı.";
  if (order.direction === "long" && !(order.stop < order.entry)) return "Long için Stop Loss, giriş fiyatının altında olmalı.";
  if (order.direction === "long" && !(order.entry < order.target)) return "Long için Take Profit, giriş fiyatının üstünde olmalı.";
  if (order.direction === "short" && !(order.entry < order.stop)) return "Short için Stop Loss, giriş fiyatının üstünde olmalı.";
  if (order.direction === "short" && !(order.target < order.entry)) return "Short için Take Profit, giriş fiyatının altında olmalı.";
  return null;
}

function levelHit(order: ManualOrder, bar: PriceBar): { price: number; reason: ExitReason } | null {
  if (order.direction === "long") {
    if (bar.open <= order.stop) return { price: bar.open, reason: "gap-stop" };
    if (bar.open >= order.target) return { price: bar.open, reason: "gap-target" };
    const stopHit = bar.low <= order.stop;
    const targetHit = bar.high >= order.target;
    if (stopHit && targetHit) return { price: order.stop, reason: "stop" };
    if (stopHit) return { price: order.stop, reason: "stop" };
    if (targetHit) return { price: order.target, reason: "target" };
    return null;
  }
  if (bar.open >= order.stop) return { price: bar.open, reason: "gap-stop" };
  if (bar.open <= order.target) return { price: bar.open, reason: "gap-target" };
  const stopHit = bar.high >= order.stop;
  const targetHit = bar.low <= order.target;
  if (stopHit && targetHit) return { price: order.stop, reason: "stop" };
  if (stopHit) return { price: order.stop, reason: "stop" };
  if (targetHit) return { price: order.target, reason: "target" };
  return null;
}

function fillAt(order: ManualOrder, bars: PriceBar[], cursor: number): Fill | null {
  if (order.entryCursor > cursor) return null;
  const manualCursor = order.manualExit && order.manualExit.cursor >= order.entryCursor ? order.manualExit.cursor : null;
  const last = Math.min(cursor, manualCursor ?? cursor);
  for (let index = order.entryCursor + 1; index <= last; index += 1) {
    const hit = levelHit(order, bars[index]);
    if (hit) return { cursor: index, price: hit.price, reason: hit.reason };
    if (manualCursor === index && order.manualExit) {
      return { cursor: index, price: order.manualExit.price, reason: "manual" };
    }
  }
  if (manualCursor === order.entryCursor && order.manualExit && manualCursor <= cursor) {
    return { cursor: manualCursor, price: order.manualExit.price, reason: "manual" };
  }
  return null;
}

function settle(order: ManualOrder, bars: PriceBar[], cursor: number, rate: number): SimulatedTrade | null {
  if (order.entryCursor > cursor || order.entryCursor < 0 || order.entryCursor >= bars.length) return null;
  const fill = fillAt(order, bars, cursor);
  const mark = bars[cursor].close;
  const closed = fill != null;
  return {
    id: order.id,
    direction: order.direction,
    entryCursor: order.entryCursor,
    exitCursor: fill?.cursor ?? null,
    entry: order.entry,
    exit: fill?.price ?? null,
    size: order.size,
    stop: order.stop,
    target: order.target,
    reason: fill?.reason ?? null,
    net: closed && fill ? tradeNet(order.direction, order.entry, fill.price, order.size, rate) : null,
    unrealized: closed ? null : openNet(order.direction, order.entry, mark, order.size, rate),
  };
}

function resultAt(order: ManualOrder, fill: Fill | null, bars: PriceBar[], index: number, rate: number) {
  if (order.entryCursor > index) return 0;
  if (fill && fill.cursor <= index) return tradeNet(order.direction, order.entry, fill.price, order.size, rate);
  return openNet(order.direction, order.entry, bars[index].close, order.size, rate);
}

export function simulateManual(orders: ManualOrder[], bars: PriceBar[], cursor: number, rate: number, startingCapital: number): BacktestSnapshot {
  const safeCursor = Math.max(0, Math.min(cursor, bars.length - 1));
  const planned = bars.length ? orders.map((order) => ({ order, fill: fillAt(order, bars, safeCursor) })) : [];
  const visible = planned
    .map(({ order }) => settle(order, bars, safeCursor, rate))
    .filter((trade): trade is SimulatedTrade => trade != null);
  const closed = visible.filter((trade) => trade.net != null);
  const open = visible.filter((trade) => trade.net == null);
  const realized = closed.reduce((sum, trade) => sum + (trade.net ?? 0), 0);
  const unrealized = open.reduce((sum, trade) => sum + (trade.unrealized ?? 0), 0);
  const wins = closed.filter((trade) => (trade.net ?? 0) > 0);
  const losses = closed.filter((trade) => (trade.net ?? 0) < 0);
  const grossWin = wins.reduce((sum, trade) => sum + (trade.net ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + (trade.net ?? 0), 0));
  let peak = startingCapital;
  let maxDrawdown = 0;
  if (bars.length) {
    for (let index = 0; index <= safeCursor; index += 1) {
      const equity = startingCapital + planned.reduce((sum, item) => sum + resultAt(item.order, item.fill, bars, index, rate), 0);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
  }
  const equity = startingCapital + realized + unrealized;
  return {
    open,
    closed,
    startingCapital,
    equity,
    realized,
    unrealized,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? wins.length / closed.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    maxDrawdown,
    maxDrawdownPercent: peak > 0 ? maxDrawdown / peak : null,
    marks: visible.map((trade) => ({
      entryIndex: trade.entryCursor,
      entryPrice: trade.entry,
      entryBuy: trade.direction === "long",
      exitIndex: trade.exitCursor,
      exitPrice: trade.exit,
      exitBuy: trade.direction === "short",
      stop: trade.exit == null ? trade.stop : null,
      target: trade.exit == null ? trade.target : null,
    })),
  };
}

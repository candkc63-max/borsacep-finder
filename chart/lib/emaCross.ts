import { ema } from "./indicators";
import type { TradeMark } from "./manualBacktest";
import type { OhlcBar } from "./parseOhlcv";
import { clipScaleTrade } from "./scalePlan";

export type EmaCrossSpec = {
  fast: number;
  slow: number;
  capital: number;
  allocation: number;
  feeRate: number;
  slippageRate: number;
};

export type StrategyIndicators = {
  emas: number[];
  rsi: number[];
  adx: number[];
  atr: number[];
  studies?: Array<{ label: string; pane: "price" | "osc"; spec: { name: string; period: number; fast: number; slow: number; signal: number; mult: number; atrPeriod: number; smooth: number; line: string } }>;
};

export type SideSignal = "buy" | "sell" | null;

export type ExitReason = "signal" | "stop" | "target" | "gap-stop" | "gap-target";

export type StopPoint = { index: number; stop: number };

export type ScaleFill = {
  seq: number;
  index: number;
  signalIndex: number;
  price: number;
  shares: number;
  commission: number;
  slippage: number;
  reason: ExitReason | "entry" | "add";
};

export type ScaleTarget = {
  profitPercent: number | null;
  ratio: number;
  price: number;
  filledIndex: number | null;
};

export type ScaleLegs = {
  entries: ScaleFill[];
  exits: ScaleFill[];
  targets: ScaleTarget[];
  riskPath: { index: number; risk: number }[];
};

export type StrategyTrade = {
  signalIndex: number;
  entryIndex: number;
  exitSignalIndex: number | null;
  exitIndex: number | null;
  entryPrice: number;
  exitPrice: number | null;
  shares: number;
  entryCommission: number;
  exitCommission: number | null;
  realized: number | null;
  /** Kapanmadan gerçekleşen parçalı kâr. Döngü kapanınca realized içine alınır. */
  booked?: number;
  /** Yalnız risk ve kademe motoru doldurur. Eski motor bu alanları yazmaz. */
  exitReason?: ExitReason;
  initialStop?: number | null;
  initialTarget?: number | null;
  activeTarget?: number | null;
  slippageCost?: number;
  stopPath?: StopPoint[];
  maxShares?: number;
  maxRisk?: number;
  legs?: ScaleLegs;
};

export type BuyHold = {
  shares: number;
  entryPrice: number;
  portfolio: number;
  totalReturn: number | null;
};

export type StrategyReport = {
  ok: boolean;
  error: string | null;
  spec: EmaCrossSpec;
  indicators: StrategyIndicators;
  adjustment: string;
  from: string | null;
  to: string | null;
  bars: number;
  trades: StrategyTrade[];
  pending: { side: "buy" | "sell"; signalIndex: number } | null;
  equity: number[];
  startingCapital: number;
  portfolio: number;
  realized: number;
  unrealized: number;
  totalReturn: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number | null;
  completed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  profitFactor: number | null;
  totalCommission: number;
  avgRewardRisk: number | null;
  stopExits: number;
  targetExits: number;
  avgWin: number | null;
  avgLoss: number | null;
  maxConsecutiveLosses: number;
  totalSlippage: number;
  maxPosition: number;
  maxOpenRisk: number;
  buyHold: BuyHold | null;
  openShares: number;
};

export function priceSeriesNote(source: "csv" | "yahoo"): string {
  if (source === "csv") return "Düzeltilmemiş. CSV dosyasındaki OHLC aynen kullanıldı.";
  return "Yahoo quote OHLC. adjclose okunmuyor; temettü düzeltmesi uygulanmadı.";
}

export function invalidStrategy(spec: EmaCrossSpec, adjustment: string, error: string, indicators: StrategyIndicators = { emas: [], rsi: [], adx: [], atr: [] }): StrategyReport {
  return empty(spec, adjustment, error, 0, indicators);
}

function empty(spec: EmaCrossSpec, adjustment: string, error: string, bars = 0, indicators: StrategyIndicators = { emas: [], rsi: [], adx: [], atr: [] }): StrategyReport {
  return {
    ok: false,
    error,
    spec,
    indicators,
    adjustment,
    from: null,
    to: null,
    bars,
    trades: [],
    pending: null,
    equity: [],
    startingCapital: spec.capital,
    portfolio: spec.capital,
    realized: 0,
    unrealized: 0,
    totalReturn: null,
    maxDrawdown: 0,
    maxDrawdownPercent: null,
    completed: 0,
    wins: 0,
    losses: 0,
    winRate: null,
    profitFactor: null,
    totalCommission: 0,
    avgRewardRisk: null,
    stopExits: 0,
    targetExits: 0,
    avgWin: null,
    avgLoss: null,
    maxConsecutiveLosses: 0,
    totalSlippage: 0,
    maxPosition: 0,
    maxOpenRisk: 0,
    buyHold: null,
    openShares: 0,
  };
}

function problem(bar: OhlcBar, index: number, previous: string | null): string | null {
  const prices = [bar.open, bar.high, bar.low, bar.close];
  if (!prices.every((value) => Number.isFinite(value))) return `${index + 1}. mumda sayı olmayan fiyat var.`;
  if (bar.low > bar.high) return `${index + 1}. mumda düşük, yüksekten büyük.`;
  if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
    return `${index + 1}. mumun yüksek/düşük değeri açılış ve kapanışla uyuşmuyor.`;
  }
  if (!bar.time) return `${index + 1}. mumun zamanı yok.`;
  if (previous != null && bar.time <= previous) return `${index + 1}. mumun zamanı bir öncekinden ileri değil.`;
  return null;
}

function wholeShares(cash: number, fill: number, feeRate: number) {
  if (!(fill > 0)) return 0;
  const unit = fill * (1 + feeRate);
  let shares = Math.floor((cash + 1e-9) / unit);
  while (shares > 0 && shares * unit > cash + 1e-8) shares -= 1;
  return shares;
}

export function summarizeStrategy(spec: EmaCrossSpec, trades: StrategyTrade[], equity: number[]): Pick<StrategyReport, "portfolio" | "realized" | "unrealized" | "totalReturn" | "maxDrawdown" | "maxDrawdownPercent" | "completed" | "wins" | "losses" | "winRate" | "profitFactor" | "totalCommission" | "avgRewardRisk" | "stopExits" | "targetExits" | "avgWin" | "avgLoss" | "maxConsecutiveLosses" | "totalSlippage" | "maxPosition" | "maxOpenRisk" | "openShares"> {
  const closed = trades.filter((trade) => trade.realized != null);
  const open = trades.find((trade) => trade.exitIndex == null);
  const booked = trades.reduce((sum, trade) => sum + (trade.exitIndex == null ? (trade.booked ?? 0) : 0), 0);
  const realized = closed.reduce((sum, trade) => sum + (trade.realized ?? 0), 0) + booked;
  const portfolio = equity.at(-1) ?? spec.capital;
  const unrealized = open ? portfolio - spec.capital - realized : 0;
  let peak = equity[0] ?? spec.capital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  for (const value of equity) {
    if (value > peak) peak = value;
    const drop = peak - value;
    if (drop > maxDrawdown) maxDrawdown = drop;
    if (peak > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, drop / peak);
  }
  const wins = closed.filter((trade) => (trade.realized ?? 0) > 0).length;
  const losses = closed.filter((trade) => (trade.realized ?? 0) < 0).length;
  const profit = closed.reduce((sum, trade) => sum + Math.max(0, trade.realized ?? 0), 0) + Math.max(0, booked);
  const loss = closed.reduce((sum, trade) => sum + Math.max(0, -(trade.realized ?? 0)), 0) + Math.max(0, -booked);
  const totalCommission = trades.reduce((sum, trade) => sum + trade.entryCommission + (trade.exitCommission ?? 0), 0);
  const rewarded = closed.filter((trade) => trade.initialStop != null && trade.entryPrice > (trade.initialStop ?? 0));
  const rewardRatios = rewarded.map((trade) => (trade.realized ?? 0) / ((trade.entryPrice - (trade.initialStop ?? 0)) * trade.shares));
  let lossStreak = 0;
  let maxConsecutiveLosses = 0;
  for (const trade of closed) {
    if ((trade.realized ?? 0) < 0) {
      lossStreak += 1;
      if (lossStreak > maxConsecutiveLosses) maxConsecutiveLosses = lossStreak;
    } else lossStreak = 0;
  }
  return {
    portfolio,
    realized,
    unrealized,
    totalReturn: spec.capital > 0 ? (portfolio - spec.capital) / spec.capital : null,
    maxDrawdown,
    maxDrawdownPercent: equity.length ? maxDrawdownPercent : null,
    completed: closed.length,
    wins,
    losses,
    winRate: closed.length ? wins / closed.length : null,
    profitFactor: closed.length === 0 ? null : loss > 0 ? profit / loss : profit > 0 ? Number.POSITIVE_INFINITY : 0,
    totalCommission,
    avgRewardRisk: rewardRatios.length ? rewardRatios.reduce((sum, ratio) => sum + ratio, 0) / rewardRatios.length : null,
    stopExits: closed.filter((trade) => trade.exitReason === "stop" || trade.exitReason === "gap-stop").length,
    targetExits: closed.filter((trade) => trade.exitReason === "target" || trade.exitReason === "gap-target").length,
    avgWin: wins ? profit / wins : null,
    avgLoss: losses ? -(loss / losses) : null,
    maxConsecutiveLosses,
    totalSlippage: trades.reduce((sum, trade) => sum + (trade.slippageCost ?? 0), 0),
    maxPosition: trades.reduce((max, trade) => Math.max(max, trade.maxShares ?? 0), 0),
    maxOpenRisk: trades.reduce((max, trade) => Math.max(max, trade.maxRisk ?? 0), 0),
    openShares: open?.shares ?? 0,
  };
}

export function backtestEmaCross(bars: OhlcBar[], spec: EmaCrossSpec, adjustment: string): StrategyReport {
  if (!Number.isInteger(spec.fast) || spec.fast < 1) return empty(spec, adjustment, "Hızlı EMA tam sayı ve en az 1 olmalı.");
  if (!Number.isInteger(spec.slow) || spec.slow <= spec.fast) return empty(spec, adjustment, "Yavaş EMA, hızlı EMA'dan büyük bir tam sayı olmalı.");
  const closes = bars.map((bar) => bar.close);
  const fast = ema(closes, spec.fast);
  const slow = ema(closes, spec.slow);
  const crossUp = (index: number) => {
    const previousFast = fast[index - 1];
    const previousSlow = slow[index - 1];
    const nextFast = fast[index];
    const nextSlow = slow[index];
    if (previousFast == null || previousSlow == null || nextFast == null || nextSlow == null) return false;
    return previousFast <= previousSlow && nextFast > nextSlow;
  };
  const crossDown = (index: number) => {
    const previousFast = fast[index - 1];
    const previousSlow = slow[index - 1];
    const nextFast = fast[index];
    const nextSlow = slow[index];
    if (previousFast == null || previousSlow == null || nextFast == null || nextSlow == null) return false;
    return previousFast >= previousSlow && nextFast < nextSlow;
  };
  return executeLong(bars, spec, adjustment, (index, inPosition) => {
    if (!inPosition && crossUp(index)) return "buy";
    if (inPosition && crossDown(index)) return "sell";
    return null;
  }, { emas: [spec.fast, spec.slow], rsi: [], adx: [], atr: [] });
}

export function executeLong(
  bars: OhlcBar[],
  spec: EmaCrossSpec,
  adjustment: string,
  signal: (index: number, inPosition: boolean) => SideSignal,
  indicators: StrategyIndicators,
): StrategyReport {
  if (!(spec.capital > 0)) return empty(spec, adjustment, "Başlangıç sermayesi sıfırdan büyük olmalı.", 0, indicators);
  if (!(spec.allocation > 0) || spec.allocation > 1) return empty(spec, adjustment, "Pozisyon büyüklüğü yüzde 1 ile 100 arasında olmalı.", 0, indicators);
  if (!(spec.feeRate >= 0) || !(spec.slippageRate >= 0)) return empty(spec, adjustment, "Komisyon ve kayma negatif olamaz.", 0, indicators);
  if (!bars.length) return empty(spec, adjustment, "Mum serisi boş.", 0, indicators);
  let previous: string | null = null;
  for (let index = 0; index < bars.length; index += 1) {
    const issue = problem(bars[index], index, previous);
    if (issue) return empty(spec, adjustment, issue, bars.length, indicators);
    previous = bars[index].time;
  }

  const trades: StrategyTrade[] = [];
  const equity: number[] = [];
  let cash = spec.capital;
  let shares = 0;
  let entryPrice = 0;
  let entryCommission = 0;
  let pending: "buy" | "sell" | null = null;
  let pendingIndex = -1;

  for (let index = 0; index < bars.length; index += 1) {
    const open = bars[index].open;
    if (pending === "buy" && shares === 0) {
      const fill = open * (1 + spec.slippageRate);
      const qty = wholeShares(cash * spec.allocation, fill, spec.feeRate);
      if (qty >= 1) {
        const commission = qty * fill * spec.feeRate;
        cash -= qty * fill + commission;
        shares = qty;
        entryPrice = fill;
        entryCommission = commission;
        trades.push({
          signalIndex: pendingIndex,
          entryIndex: index,
          exitSignalIndex: null,
          exitIndex: null,
          entryPrice: fill,
          exitPrice: null,
          shares: qty,
          entryCommission: commission,
          exitCommission: null,
          realized: null,
        });
      }
    } else if (pending === "sell" && shares > 0) {
      const fill = open * (1 - spec.slippageRate);
      const commission = shares * fill * spec.feeRate;
      const openTrade = trades[trades.length - 1];
      cash += shares * fill - commission;
      openTrade.exitSignalIndex = pendingIndex;
      openTrade.exitIndex = index;
      openTrade.exitPrice = fill;
      openTrade.exitCommission = commission;
      openTrade.realized = (fill - entryPrice) * shares - entryCommission - commission;
      shares = 0;
      entryPrice = 0;
      entryCommission = 0;
    }
    pending = null;
    if (index < bars.length - 1) {
      const next = signal(index, shares > 0);
      if (next) {
        pending = next;
        pendingIndex = index;
      }
    }
    equity.push(cash + shares * bars[index].close);
  }

  const lastSignal = signal(bars.length - 1, shares > 0);
  const hanging = lastSignal
    ? { side: lastSignal, signalIndex: bars.length - 1 }
    : pending
      ? { side: pending, signalIndex: pendingIndex }
      : null;

  const buyFill = bars[0].open * (1 + spec.slippageRate);
  const buyShares = wholeShares(spec.capital * spec.allocation, buyFill, spec.feeRate);
  const buyHold = buyShares >= 1
    ? {
        shares: buyShares,
        entryPrice: buyFill,
        portfolio: spec.capital - buyShares * buyFill * (1 + spec.feeRate) + buyShares * bars[bars.length - 1].close,
        totalReturn: null as number | null,
      }
    : { shares: 0, entryPrice: buyFill, portfolio: spec.capital, totalReturn: 0 };
  buyHold.totalReturn = spec.capital > 0 ? (buyHold.portfolio - spec.capital) / spec.capital : null;

  return {
    ok: true,
    error: null,
    spec,
    indicators,
    adjustment,
    from: bars[0].time,
    to: bars[bars.length - 1].time,
    bars: bars.length,
    trades,
    pending: hanging,
    equity,
    startingCapital: spec.capital,
    ...summarizeStrategy(spec, trades, equity),
    buyHold,
  };
}

export function projectStrategy(report: StrategyReport, bars: OhlcBar[], cursor: number): StrategyReport {
  if (!report.ok) return report;
  const end = Math.max(0, Math.min(cursor, bars.length - 1, report.equity.length - 1));
  const equity = report.equity.slice(0, end + 1);
  const trades = report.trades.flatMap((trade) => {
    if (trade.legs) {
      const clipped = clipScaleTrade(trade, end);
      return clipped ? [clipped] : [];
    }
    if (trade.entryIndex > end) return [];
    const stopPath = trade.stopPath?.filter((point) => point.index <= end);
    if (trade.exitIndex == null || trade.exitIndex > end) {
      return [{ ...trade, exitSignalIndex: null, exitIndex: null, exitPrice: null, exitCommission: null, realized: null, stopPath }];
    }
    return [trade];
  });
  const nextEntry = report.trades.find((trade) => trade.signalIndex === end && trade.entryIndex > end);
  const nextExit = report.trades.find((trade) => trade.exitSignalIndex === end && trade.exitIndex != null && trade.exitIndex > end);
  const nextAdd = report.trades.find((trade) => trade.legs?.entries.some((leg) => leg.reason === "add" && leg.signalIndex === end && leg.index > end));
  const pending = nextEntry || nextAdd
    ? { side: "buy" as const, signalIndex: end }
    : nextExit
      ? { side: "sell" as const, signalIndex: end }
      : report.pending && report.pending.signalIndex === end
        ? report.pending
        : null;
  const buyHold = report.buyHold
    ? {
        ...report.buyHold,
        portfolio: report.buyHold.shares > 0
          ? report.spec.capital - report.buyHold.shares * report.buyHold.entryPrice * (1 + report.spec.feeRate) + report.buyHold.shares * bars[end].close
          : report.spec.capital,
        totalReturn: null as number | null,
      }
    : null;
  if (buyHold) buyHold.totalReturn = report.spec.capital > 0 ? (buyHold.portfolio - report.spec.capital) / report.spec.capital : null;
  return {
    ...report,
    to: bars[end].time,
    bars: end + 1,
    trades,
    pending,
    equity,
    ...summarizeStrategy(report.spec, trades, equity),
    buyHold,
  };
}

function activeStop(trade: StrategyTrade): number | null {
  const path = trade.stopPath;
  if (path?.length) return path[path.length - 1].stop;
  return trade.initialStop ?? null;
}

function singleMark(trade: StrategyTrade): TradeMark {
  const open = trade.exitIndex == null;
  return {
    entryIndex: trade.entryIndex,
    entryPrice: trade.entryPrice,
    entryBuy: true,
    exitIndex: trade.exitIndex,
    exitPrice: trade.exitPrice,
    exitBuy: false,
    stop: open ? activeStop(trade) : null,
    target: open ? (trade.activeTarget ?? trade.initialTarget ?? null) : null,
    average: open && trade.legs ? trade.entryPrice : null,
    showPrice: true,
  };
}

export function strategyMarks(trades: StrategyTrade[]): TradeMark[] {
  return trades.flatMap((trade) => {
    if (!trade.legs?.entries.length) return [singleMark(trade)];
    const open = trade.exitIndex == null;
    const marks: TradeMark[] = trade.legs.entries.map((leg, index, all) => ({
      entryIndex: leg.index,
      entryPrice: leg.price,
      entryBuy: true,
      exitIndex: null,
      exitPrice: null,
      exitBuy: false,
      stop: open && index === all.length - 1 ? activeStop(trade) : null,
      target: open && index === all.length - 1 ? (trade.activeTarget ?? null) : null,
      average: open && index === all.length - 1 ? trade.entryPrice : null,
      showPrice: true,
    }));
    for (const leg of trade.legs.exits) {
      marks.push({
        entryIndex: leg.index,
        entryPrice: leg.price,
        entryBuy: false,
        exitIndex: null,
        exitPrice: null,
        exitBuy: false,
        stop: null,
        target: null,
        showPrice: true,
      });
    }
    return marks;
  });
}

import type { ExitReason, ScaleLegs, StrategyTrade } from "./emaCross";
import type { OhlcBar } from "./parseOhlcv";

/**
 * Kademeli giriş ve çıkış. Kapalıyken backtest bu modülü çağırmaz.
 * Satış miktarı, satış anındaki açık adet değil, ilk satıştan önce oluşan
 * referans adede göredir. Son aşama kalanı kapatır.
 * Aynı mumda stop ve hedef birlikte varsa stop önce gelir.
 */
export type AddTrigger = "percent" | "ema" | "break-high" | "atr";

export type ScaleExit = {
  profitPercent: number;
  ratio: number;
};

export type ScaleSettings = {
  enabled: boolean;
  trigger: AddTrigger;
  triggerPercent: number;
  emaFast: number;
  emaSlow: number;
  atrPeriod: number;
  atrMult: number;
  entryRatios: number[];
  exits: ScaleExit[];
  maxRiskPercent: number | null;
};

export type ScaleDraft = {
  enabled: boolean;
  trigger: AddTrigger;
  triggerPercent: number;
  emaFast: number;
  emaSlow: number;
  atrPeriod: number;
  atrMult: number;
  entryPercents: number[];
  exitPercents: number[];
  exitSellPercents: number[];
  maxRiskPercent: number | null;
};

const TRIGGERS = new Set<AddTrigger>(["percent", "ema", "break-high", "atr"]);

export function defaultScaleDraft(): ScaleDraft {
  return {
    enabled: false,
    trigger: "percent",
    triggerPercent: 1,
    emaFast: 20,
    emaSlow: 50,
    atrPeriod: 14,
    atrMult: 1,
    entryPercents: [100],
    exitPercents: [],
    exitSellPercents: [],
    maxRiskPercent: null,
  };
}

export function inactiveScale(): ScaleSettings {
  return settingsFromScaleDraft(defaultScaleDraft());
}

export function settingsFromScaleDraft(draft: ScaleDraft): ScaleSettings {
  return {
    enabled: draft.enabled,
    trigger: draft.trigger,
    triggerPercent: draft.triggerPercent / 100,
    emaFast: draft.emaFast,
    emaSlow: draft.emaSlow,
    atrPeriod: draft.atrPeriod,
    atrMult: draft.atrMult,
    entryRatios: (draft.entryPercents.length ? draft.entryPercents : [100]).map((value) => value / 100),
    exits: draft.exitPercents.map((profit, index) => ({
      profitPercent: profit / 100,
      ratio: (draft.exitSellPercents[index] ?? 0) / 100,
    })),
    maxRiskPercent: draft.maxRiskPercent == null ? null : draft.maxRiskPercent / 100,
  };
}

export function isScaleActive(scale: ScaleSettings | undefined | null): boolean {
  if (!scale?.enabled) return false;
  return scale.entryRatios.length > 1 || scale.exits.length > 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function scaleError(scale: ScaleSettings | undefined | null): string | null {
  if (!scale || !isScaleActive(scale)) return null;
  if (!TRIGGERS.has(scale.trigger)) return "Pozisyon artırma koşulu tanınmıyor.";
  if (!scale.entryRatios.length || scale.entryRatios.some((ratio) => !(ratio > 0))) return "Giriş oranları sıfırdan büyük olmalı.";
  if (Math.abs(sum(scale.entryRatios) - 1) > 1e-6) return "Giriş oranlarının toplamı yüzde 100 olmalı.";
  if (scale.trigger === "percent" && !(scale.triggerPercent > 0)) return "Artırma yüzdesi sıfırdan büyük olmalı.";
  if (scale.trigger === "ema" && (!Number.isInteger(scale.emaFast) || !Number.isInteger(scale.emaSlow) || scale.emaFast < 1 || scale.emaSlow <= scale.emaFast)) {
    return "Artırma EMA periyotları, yavaş periyot daha büyük olacak şekilde tam sayı olmalı.";
  }
  if (scale.trigger === "atr" && (!Number.isInteger(scale.atrPeriod) || scale.atrPeriod < 1 || !(scale.atrMult > 0))) {
    return "Artırma ATR periyodu tam sayı, çarpan sıfırdan büyük olmalı.";
  }
  if (scale.exits.length) {
    let previous = 0;
    let sold = 0;
    for (let index = 0; index < scale.exits.length; index += 1) {
      const stage = scale.exits[index];
      if (!(stage.profitPercent > previous)) return "Kâr hedefleri artan sırada olmalı.";
      previous = stage.profitPercent;
      const last = index === scale.exits.length - 1;
      if (!last && !(stage.ratio > 0)) return "Ara satış oranı sıfırdan büyük olmalı.";
      if (!last) sold += stage.ratio;
    }
    if (sold >= 1) return "Ara satışların toplamı yüzde 100'ün altında olmalı. Son aşama kalanı kapatır.";
  }
  if (scale.maxRiskPercent != null && (!(scale.maxRiskPercent > 0) || scale.maxRiskPercent > 1)) {
    return "Toplam risk sınırı yüzde 0 ile 100 arasında olmalı.";
  }
  return null;
}

export function splitEntryShares(total: number, ratios: number[]): number[] {
  if (total < 1 || !ratios.length) return ratios.map(() => 0);
  const qty = ratios.map((ratio, index) => (index === ratios.length - 1 ? 0 : Math.floor(total * ratio + 1e-9)));
  qty[qty.length - 1] = total - qty.reduce((count, value) => count + value, 0);
  if (qty[0] < 1) {
    qty[0] = 1;
    let rest = total - 1;
    for (let index = 1; index < qty.length - 1; index += 1) {
      qty[index] = Math.min(qty[index], rest);
      rest -= qty[index];
    }
    qty[qty.length - 1] = rest;
  }
  return qty;
}

/** Referans adet ilk satıştan önce dondurulur. Son aşama açık kalanın tamamıdır. */
export function scaleExitShares(reference: number, ratio: number, openShares: number, last: boolean): number {
  if (openShares < 1) return 0;
  if (last) return openShares;
  return Math.min(openShares, Math.floor(reference * ratio + 1e-9));
}

export function brokePriorHigh(bars: OhlcBar[], fromIndex: number, index: number): boolean {
  if (index <= fromIndex) return false;
  let high = Number.NEGATIVE_INFINITY;
  for (let cursor = fromIndex; cursor < index; cursor += 1) high = Math.max(high, bars[cursor].high);
  return bars[index].close > high;
}

export function addTriggered(
  settings: ScaleSettings,
  bars: OhlcBar[],
  index: number,
  previousFill: number,
  entryIndex: number,
  fast: Array<number | null>,
  slow: Array<number | null>,
  atrSeries: Array<number | null>,
): boolean {
  if (!(previousFill > 0) || index < 0) return false;
  const close = bars[index].close;
  if (settings.trigger === "percent") return close >= previousFill * (1 + settings.triggerPercent);
  if (settings.trigger === "atr") {
    const value = atrSeries[index];
    return value != null && close >= previousFill + settings.atrMult * value;
  }
  if (settings.trigger === "ema") {
    const previousFast = fast[index - 1];
    const previousSlow = slow[index - 1];
    const nextFast = fast[index];
    const nextSlow = slow[index];
    if (previousFast == null || previousSlow == null || nextFast == null || nextSlow == null) return false;
    return previousFast <= previousSlow && nextFast > nextSlow;
  }
  return brokePriorHigh(bars, entryIndex, index);
}

export function positionRisk(shares: number, average: number, stop: number | null, feeRate: number, slippageRate: number): number {
  if (!(shares > 0) || stop == null || !(average > stop)) return 0;
  const stopFill = stop * (1 - slippageRate);
  return shares * ((average - stopFill) + feeRate * (average + stopFill));
}

export function clipScaleTrade(trade: StrategyTrade, end: number): StrategyTrade | null {
  const legs = trade.legs;
  if (!legs) return trade;
  const entries = legs.entries.filter((leg) => leg.index <= end);
  if (!entries.length) return null;
  const exits = legs.exits.filter((leg) => leg.index <= end);
  let shares = 0;
  let average = 0;
  let entryCommission = 0;
  let pool = 0;
  let exitCommission = 0;
  let slippage = 0;
  let booked = 0;
  let maxShares = 0;
  const ordered = [...entries.map((leg) => ({ leg, side: "buy" as const })), ...exits.map((leg) => ({ leg, side: "sell" as const }))].sort((a, b) => a.leg.seq - b.leg.seq);
  for (const item of ordered) {
    if (item.side === "buy") {
      average = shares === 0 ? item.leg.price : (average * shares + item.leg.price * item.leg.shares) / (shares + item.leg.shares);
      shares += item.leg.shares;
      entryCommission += item.leg.commission;
      pool += item.leg.commission;
      slippage += item.leg.slippage;
      maxShares = Math.max(maxShares, shares);
    } else if (shares > 0) {
      const qty = Math.min(shares, item.leg.shares);
      const slice = pool * qty / shares;
      pool -= slice;
      booked += (item.leg.price - average) * qty - item.leg.commission - slice;
      shares -= qty;
      exitCommission += item.leg.commission;
      slippage += item.leg.slippage;
    }
  }
  const next = legs.targets.find((stage) => stage.filledIndex == null || stage.filledIndex > end);
  const activeTarget = shares > 0 && next ? (next.profitPercent == null ? next.price : average * (1 + next.profitPercent)) : null;
  const stopPath = trade.stopPath?.filter((point) => point.index <= end);
  const riskPath = legs.riskPath.filter((point) => point.index <= end);
  const maxRisk = riskPath.reduce((max, point) => Math.max(max, point.risk), 0);
  const open = shares > 0;
  const lastExit = exits.at(-1);
  const closedBy = lastExit && !open ? lastExit.reason : null;
  return {
    ...trade,
    entryIndex: entries[0].index,
    entryPrice: average,
    shares: open ? shares : maxShares,
    exitIndex: open ? null : lastExit?.index ?? null,
    exitPrice: open ? null : lastExit?.price ?? null,
    exitSignalIndex: open || closedBy !== "signal" ? null : lastExit?.signalIndex ?? null,
    exitCommission: exits.length ? exitCommission : null,
    entryCommission,
    realized: open ? null : booked,
    booked: open ? booked : undefined,
    exitReason: open || !closedBy || closedBy === "entry" || closedBy === "add" ? trade.exitReason : closedBy as ExitReason,
    slippageCost: slippage,
    stopPath,
    activeTarget,
    maxShares,
    maxRisk,
    legs: {
      entries,
      exits,
      targets: legs.targets,
      riskPath,
    } satisfies ScaleLegs,
  };
}

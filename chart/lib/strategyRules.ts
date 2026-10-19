import { adx, atr, ema, rsi } from "./indicators";
import { executeLong, invalidStrategy, type EmaCrossSpec, type StrategyIndicators, type StrategyReport } from "./emaCross";
import type { OhlcBar } from "./parseOhlcv";

export type Join = "and" | "or";

export type Condition =
  | { id: string; kind: "ema-cross"; fast: number; slow: number; direction: "up" | "down" }
  | { id: string; kind: "price-ema"; period: number; direction: "above" | "below" | "cross-up" | "cross-down" }
  | { id: string; kind: "rsi-cross"; period: number; level: number; direction: "up" | "down" }
  | { id: string; kind: "adx-level"; period: number; level: number; relation: "above" | "below" }
  | { id: string; kind: "atr-level"; period: number; level: number; relation: "above" | "below" };

export type StrategyRules = {
  name: string;
  capital: number;
  allocation: number;
  feeRate: number;
  slippageRate: number;
  buyJoin: Join;
  sellJoin: Join;
  buy: Condition[];
  sell: Condition[];
};

type Series = Array<number | null>;

type Cache = {
  closes: number[];
  ema: Map<number, Series>;
  rsi: Map<number, Series>;
  adx: Map<number, Series>;
  atr: Map<number, Series>;
};

function crossed(previous: number | null | undefined, current: number | null | undefined, level: number, direction: "up" | "down") {
  if (previous == null || current == null || !Number.isFinite(level)) return false;
  return direction === "up" ? previous <= level && current > level : previous >= level && current < level;
}

function compared(value: number | null | undefined, level: number, relation: "above" | "below") {
  if (value == null || !Number.isFinite(level)) return false;
  return relation === "above" ? value > level : value < level;
}

function periodsOf(conditions: Condition[]) {
  const emas = new Set<number>();
  const rsiPeriods = new Set<number>();
  const adxPeriods = new Set<number>();
  const atrPeriods = new Set<number>();
  for (const condition of conditions) {
    if (condition.kind === "ema-cross") {
      emas.add(condition.fast);
      emas.add(condition.slow);
    } else if (condition.kind === "price-ema") emas.add(condition.period);
    else if (condition.kind === "rsi-cross") rsiPeriods.add(condition.period);
    else if (condition.kind === "adx-level") adxPeriods.add(condition.period);
    else atrPeriods.add(condition.period);
  }
  return {
    emas: [...emas].filter((period) => period >= 1).sort((a, b) => a - b),
    rsi: [...rsiPeriods].sort((a, b) => a - b),
    adx: [...adxPeriods].sort((a, b) => a - b),
    atr: [...atrPeriods].sort((a, b) => a - b),
  };
}

export function indicatorSetup(rules: Pick<StrategyRules, "buy" | "sell">): StrategyIndicators {
  return periodsOf([...rules.buy, ...rules.sell]);
}

function cacheFor(bars: OhlcBar[], indicators: StrategyIndicators): Cache {
  const closes = bars.map((bar) => bar.close);
  const cache: Cache = { closes, ema: new Map(), rsi: new Map(), adx: new Map(), atr: new Map() };
  for (const period of indicators.emas) cache.ema.set(period, ema(closes, period));
  for (const period of indicators.rsi) cache.rsi.set(period, rsi(closes, period));
  for (const period of indicators.adx) cache.adx.set(period, adx(bars, period));
  for (const period of indicators.atr) cache.atr.set(period, atr(bars, period));
  return cache;
}

export function conditionMet(condition: Condition, index: number, cache: Cache): boolean {
  if (condition.kind === "ema-cross") {
    const fast = cache.ema.get(condition.fast);
    const slow = cache.ema.get(condition.slow);
    const previousFast = fast?.[index - 1];
    const previousSlow = slow?.[index - 1];
    const nextFast = fast?.[index];
    const nextSlow = slow?.[index];
    if (previousFast == null || previousSlow == null || nextFast == null || nextSlow == null) return false;
    return condition.direction === "up"
      ? previousFast <= previousSlow && nextFast > nextSlow
      : previousFast >= previousSlow && nextFast < nextSlow;
  }
  if (condition.kind === "price-ema") {
    const line = cache.ema.get(condition.period);
    const current = line?.[index];
    const close = cache.closes[index];
    if (condition.direction === "above") return current != null && close > current;
    if (condition.direction === "below") return current != null && close < current;
    const previous = line?.[index - 1];
    const previousClose = cache.closes[index - 1];
    if (previous == null || current == null || previousClose == null) return false;
    return condition.direction === "cross-up"
      ? previousClose <= previous && close > current
      : previousClose >= previous && close < current;
  }
  if (condition.kind === "rsi-cross") {
    const line = cache.rsi.get(condition.period);
    return crossed(line?.[index - 1], line?.[index], condition.level, condition.direction);
  }
  if (condition.kind === "adx-level") return compared(cache.adx.get(condition.period)?.[index], condition.level, condition.relation);
  return compared(cache.atr.get(condition.period)?.[index], condition.level, condition.relation);
}

export function conditionSeries(bars: OhlcBar[], conditions: Condition[], join: Join): boolean[] {
  const cache = cacheFor(bars, periodsOf(conditions));
  return bars.map((_, index) => groupMet(conditions, join, index, cache));
}

function groupMet(conditions: Condition[], join: Join, index: number, cache: Cache) {
  if (!conditions.length) return false;
  return join === "and"
    ? conditions.every((condition) => conditionMet(condition, index, cache))
    : conditions.some((condition) => conditionMet(condition, index, cache));
}

function integerPeriod(value: number) {
  return Number.isInteger(value) && value >= 1;
}

function conditionError(condition: Condition, side: "AL" | "SAT"): string | null {
  if (condition.kind === "ema-cross") {
    if (!integerPeriod(condition.fast) || !integerPeriod(condition.slow)) return `${side} EMA periyotları 1 veya daha büyük tam sayı olmalı.`;
    if (condition.fast === condition.slow) return `${side} EMA kesişiminde periyotlar farklı olmalı.`;
    return null;
  }
  if (condition.kind === "price-ema") {
    return integerPeriod(condition.period) ? null : `${side} EMA periyodu 1 veya daha büyük tam sayı olmalı.`;
  }
  if (condition.kind === "rsi-cross") {
    if (!integerPeriod(condition.period)) return `${side} RSI periyodu 1 veya daha büyük tam sayı olmalı.`;
    if (!Number.isFinite(condition.level)) return `${side} RSI seviyesi sayı olmalı.`;
    return null;
  }
  if (!integerPeriod(condition.period)) return `${side} ${condition.kind === "adx-level" ? "ADX" : "ATR"} periyodu 1 veya daha büyük tam sayı olmalı.`;
  if (!Number.isFinite(condition.level)) return `${side} eşik sayı olmalı.`;
  return null;
}

function rulesError(rules: StrategyRules): string | null {
  if (!rules.buy.length) return "En az bir AL koşulu gerekli.";
  if (rules.buyJoin !== "and" && rules.buyJoin !== "or") return "AL birleştirme VE veya VEYA olmalı.";
  if (rules.sellJoin !== "and" && rules.sellJoin !== "or") return "SAT birleştirme VE veya VEYA olmalı.";
  for (const condition of rules.buy) {
    const issue = conditionError(condition, "AL");
    if (issue) return issue;
  }
  for (const condition of rules.sell) {
    const issue = conditionError(condition, "SAT");
    if (issue) return issue;
  }
  return null;
}

export function backtestRules(bars: OhlcBar[], rules: StrategyRules, adjustment: string): StrategyReport {
  const indicators = indicatorSetup(rules);
  const spec: EmaCrossSpec = {
    fast: indicators.emas[0] ?? 1,
    slow: indicators.emas[1] ?? Math.max(2, (indicators.emas[0] ?? 1) + 1),
    capital: rules.capital,
    allocation: rules.allocation,
    feeRate: rules.feeRate,
    slippageRate: rules.slippageRate,
  };
  const issue = rulesError(rules);
  if (issue) return invalidStrategy(spec, adjustment, issue, indicators);
  const cache = cacheFor(bars, indicators);
  return executeLong(bars, spec, adjustment, (index, inPosition) => {
    const buy = groupMet(rules.buy, rules.buyJoin, index, cache);
    const sell = groupMet(rules.sell, rules.sellJoin, index, cache);
    if (!inPosition && buy) return "buy";
    if (inPosition && sell) return "sell";
    return null;
  }, indicators);
}

export function emaCrossRules(fast = 20, slow = 50, money: Partial<Pick<StrategyRules, "capital" | "allocation" | "feeRate" | "slippageRate">> = {}): StrategyRules {
  return {
    name: `EMA ${fast}/${slow}`,
    capital: money.capital ?? 100_000,
    allocation: money.allocation ?? 1,
    feeRate: money.feeRate ?? 0.0005,
    slippageRate: money.slippageRate ?? 0,
    buyJoin: "and",
    sellJoin: "and",
    buy: [{ id: "buy-ema", kind: "ema-cross", fast, slow, direction: "up" }],
    sell: [{ id: "sell-ema", kind: "ema-cross", fast, slow, direction: "down" }],
  };
}

export function describeCondition(condition: Condition): string {
  if (condition.kind === "ema-cross") {
    return `EMA ${condition.fast}, EMA ${condition.slow} ${condition.direction === "up" ? "yukarı keser" : "aşağı keser"}`;
  }
  if (condition.kind === "price-ema") {
    const text = condition.direction === "above" ? "üzerinde" : condition.direction === "below" ? "altında" : condition.direction === "cross-up" ? "yukarı keser" : "aşağı keser";
    return `Kapanış EMA ${condition.period} ${text}`;
  }
  if (condition.kind === "rsi-cross") return `RSI ${condition.period}, ${condition.level} seviyesini ${condition.direction === "up" ? "yukarı keser" : "aşağı keser"}`;
  if (condition.kind === "adx-level") return `ADX ${condition.period}, ${condition.level} ${condition.relation === "above" ? "üzerinde" : "altında"}`;
  return `ATR ${condition.period}, ${condition.level} ${condition.relation === "above" ? "üzerinde" : "altında"}`;
}

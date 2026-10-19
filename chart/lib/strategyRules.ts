import { adx, atr, ema, rsi } from "./indicators";
import { indicatorLine, studyPane, type LineSpec } from "./moreIndicators";
import { executeLong, invalidStrategy, type EmaCrossSpec, type StrategyIndicators, type StrategyReport } from "./emaCross";
import { executeManagedLong } from "./riskBacktest";
import { inactiveSettings, isRiskActive, riskError, type RiskSettings } from "./riskPlan";
import type { OhlcBar } from "./parseOhlcv";

export type Join = "and" | "or";
export type { LineSpec };

export type Operand =
  | { source: "price"; field: "open" | "high" | "low" | "close" }
  | { source: "constant"; value: number }
  | { source: "indicator"; spec: LineSpec };

export type CompareOp =
  | "above" | "below" | "gt" | "lt" | "cross-up" | "cross-down"
  | "break-prev-high" | "break-prev-low" | "break-highest" | "break-lowest";

export type Condition =
  | { id: string; kind: "ema-cross"; fast: number; slow: number; direction: "up" | "down" }
  | { id: string; kind: "price-ema"; period: number; direction: "above" | "below" | "cross-up" | "cross-down" }
  | { id: string; kind: "rsi-cross"; period: number; level: number; direction: "up" | "down" }
  | { id: string; kind: "adx-level"; period: number; level: number; relation: "above" | "below" }
  | { id: string; kind: "atr-level"; period: number; level: number; relation: "above" | "below" }
  | { id: string; kind: "compare"; left: Operand; op: CompareOp; right: Operand; length: number };

export type ConditionGroup = {
  id: string;
  join: Join;
  conditions: Condition[];
};

export type { RiskSettings };
/** Kapalı risk. Bu hali executeLong ile aynı sonucu verir. Kademeli giriş ve çıkış yok. */
export const UNUSED_RISK: RiskSettings = inactiveSettings();

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
  buyGroups?: ConditionGroup[];
  sellGroups?: ConditionGroup[];
  risk?: RiskSettings;
};

type Series = Array<number | null>;

type Cache = {
  bars: OhlcBar[];
  closes: number[];
  ema: Map<number, Series>;
  rsi: Map<number, Series>;
  adx: Map<number, Series>;
  atr: Map<number, Series>;
  lines: Map<string, Series>;
};

export function lineKey(spec: LineSpec) {
  return [spec.name, spec.period, spec.fast, spec.slow, spec.signal, spec.mult, spec.atrPeriod, spec.smooth, spec.line].join("|");
}

function crossed(previous: number | null | undefined, current: number | null | undefined, level: number, direction: "up" | "down") {
  if (previous == null || current == null || !Number.isFinite(level)) return false;
  return direction === "up" ? previous <= level && current > level : previous >= level && current < level;
}

function compared(value: number | null | undefined, level: number, relation: "above" | "below") {
  if (value == null || !Number.isFinite(level)) return false;
  return relation === "above" ? value > level : value < level;
}

function specsIn(condition: Condition): LineSpec[] {
  if (condition.kind !== "compare") return [];
  return [condition.left, condition.right].flatMap((operand) => operand.source === "indicator" ? [operand.spec] : []);
}

function periodsOf(conditions: Condition[]) {
  const emas = new Set<number>();
  const rsiPeriods = new Set<number>();
  const adxPeriods = new Set<number>();
  const atrPeriods = new Set<number>();
  const studies = new Map<string, NonNullable<StrategyIndicators["studies"]>[number]>();
  for (const condition of conditions) {
    if (condition.kind === "ema-cross") {
      emas.add(condition.fast);
      emas.add(condition.slow);
    } else if (condition.kind === "price-ema") emas.add(condition.period);
    else if (condition.kind === "rsi-cross") rsiPeriods.add(condition.period);
    else if (condition.kind === "adx-level") adxPeriods.add(condition.period);
    else if (condition.kind === "atr-level") atrPeriods.add(condition.period);
    for (const spec of specsIn(condition)) {
      if (spec.name === "ema") emas.add(spec.period);
      else if (spec.name === "rsi") rsiPeriods.add(spec.period);
      else if (spec.name === "adx") adxPeriods.add(spec.period);
      else if (spec.name === "atr") atrPeriods.add(spec.period);
      else studies.set(lineKey(spec), { label: studyLabel(spec), pane: studyPane(spec.name), spec });
    }
  }
  return {
    emas: [...emas].filter((period) => period >= 1).sort((a, b) => a - b),
    rsi: [...rsiPeriods].sort((a, b) => a - b),
    adx: [...adxPeriods].sort((a, b) => a - b),
    atr: [...atrPeriods].sort((a, b) => a - b),
    studies: [...studies.values()],
  };
}

function studyLabel(spec: LineSpec) {
  if (spec.name === "macd") return `MACD ${spec.fast}/${spec.slow}/${spec.signal} ${spec.line}`;
  if (spec.name === "stoch") return `Stoch ${spec.period}/${spec.smooth} ${spec.line}`;
  if (spec.name === "bb") return `Bollinger ${spec.period} ${spec.line}`;
  if (spec.name === "keltner") return `Keltner ${spec.period}/${spec.atrPeriod} ${spec.line}`;
  if (spec.name === "donchian") return `Donchian ${spec.period} ${spec.line}`;
  if (spec.name === "supertrend") return `Supertrend ${spec.period}x${spec.mult}`;
  return `${spec.name.toUpperCase()} ${spec.period}`;
}

export function indicatorSetup(rules: Pick<StrategyRules, "buy" | "sell" | "buyGroups" | "sellGroups">): StrategyIndicators {
  return periodsOf(listedConditions(rules as StrategyRules));
}

function cacheFor(bars: OhlcBar[], indicators: StrategyIndicators, conditions: Condition[]): Cache {
  const closes = bars.map((bar) => bar.close);
  const cache: Cache = { bars, closes, ema: new Map(), rsi: new Map(), adx: new Map(), atr: new Map(), lines: new Map() };
  for (const period of indicators.emas) cache.ema.set(period, ema(closes, period));
  for (const period of indicators.rsi) cache.rsi.set(period, rsi(closes, period));
  for (const period of indicators.adx) cache.adx.set(period, adx(bars, period));
  for (const period of indicators.atr) cache.atr.set(period, atr(bars, period));
  for (const condition of conditions) {
    for (const spec of specsIn(condition)) {
      const key = lineKey(spec);
      if (!cache.lines.has(key)) cache.lines.set(key, indicatorLine(bars, spec));
    }
  }
  return cache;
}

function listedConditions(rules: StrategyRules) {
  return [
    ...rules.buy,
    ...rules.sell,
    ...(rules.buyGroups ?? []).flatMap((group) => group.conditions),
    ...(rules.sellGroups ?? []).flatMap((group) => group.conditions),
  ];
}

function valueAt(operand: Operand, index: number, cache: Cache): number | null {
  if (operand.source === "constant") return Number.isFinite(operand.value) ? operand.value : null;
  if (operand.source === "price") {
    const bar = cache.bars[index];
    return bar ? bar[operand.field] : null;
  }
  const value = cache.lines.get(lineKey(operand.spec))?.[index];
  return value == null ? null : value;
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
  if (condition.kind === "atr-level") return compared(cache.atr.get(condition.period)?.[index], condition.level, condition.relation);
  return compareAt(condition, index, cache);
}

function compareAt(condition: Extract<Condition, { kind: "compare" }>, index: number, cache: Cache) {
  const left = valueAt(condition.left, index, cache);
  if (condition.op === "break-prev-high" || condition.op === "break-prev-low") {
    const previous = cache.bars[index - 1];
    if (left == null || !previous) return false;
    return condition.op === "break-prev-high" ? left > previous.high : left < previous.low;
  }
  if (condition.op === "break-highest" || condition.op === "break-lowest") {
    const length = condition.length;
    if (left == null || !Number.isInteger(length) || length < 1 || index < length) return false;
    let extreme = condition.op === "break-highest" ? -Infinity : Infinity;
    for (let offset = 1; offset <= length; offset += 1) {
      const bar = cache.bars[index - offset];
      extreme = condition.op === "break-highest" ? Math.max(extreme, bar.high) : Math.min(extreme, bar.low);
    }
    return condition.op === "break-highest" ? left > extreme : left < extreme;
  }
  const right = valueAt(condition.right, index, cache);
  if (left == null || right == null) return false;
  if (condition.op === "above" || condition.op === "gt") return left > right;
  if (condition.op === "below" || condition.op === "lt") return left < right;
  const previousLeft = valueAt(condition.left, index - 1, cache);
  const previousRight = valueAt(condition.right, index - 1, cache);
  if (previousLeft == null || previousRight == null) return false;
  return condition.op === "cross-up"
    ? previousLeft <= previousRight && left > right
    : previousLeft >= previousRight && left < right;
}

export function conditionSeries(bars: OhlcBar[], conditions: Condition[], join: Join): boolean[] {
  const cache = cacheFor(bars, periodsOf(conditions), conditions);
  return bars.map((_, index) => groupMet(conditions, join, index, cache));
}

export function groupSignal(bars: OhlcBar[], groups: ConditionGroup[], outer: Join): boolean[] {
  const conditions = groups.flatMap((group) => group.conditions);
  const cache = cacheFor(bars, periodsOf(conditions), conditions);
  return bars.map((_, index) => {
    if (!groups.length) return false;
    const flags = groups.map((group) => groupMet(group.conditions, group.join, index, cache));
    return outer === "and" ? flags.every(Boolean) : flags.some(Boolean);
  });
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
  if (condition.kind === "adx-level" || condition.kind === "atr-level") {
    if (!integerPeriod(condition.period)) return `${side} ${condition.kind === "adx-level" ? "ADX" : "ATR"} periyodu 1 veya daha büyük tam sayı olmalı.`;
    if (!Number.isFinite(condition.level)) return `${side} eşik sayı olmalı.`;
    return null;
  }
  for (const operand of [condition.left, condition.right]) {
    if (operand.source === "constant" && !Number.isFinite(operand.value)) return `${side} sabit sayı geçersiz.`;
    if (operand.source === "indicator") {
      const issue = specError(operand.spec, side);
      if (issue) return issue;
    }
  }
  if ((condition.op === "break-highest" || condition.op === "break-lowest") && !integerPeriod(condition.length)) {
    return `${side} kırılım penceresi 1 veya daha büyük tam sayı olmalı.`;
  }
  return null;
}

function specError(spec: LineSpec, side: "AL" | "SAT"): string | null {
  const periodNames = new Set(["sma", "ema", "wma", "hma", "rsi", "adx", "atr", "cci", "roc", "stoch", "bb", "keltner", "donchian", "supertrend"]);
  if (periodNames.has(spec.name) && !integerPeriod(spec.period)) return `${side} periyot 1 veya daha büyük tam sayı olmalı.`;
  if (spec.name === "macd" && (!integerPeriod(spec.fast) || !integerPeriod(spec.slow) || !integerPeriod(spec.signal))) return `${side} MACD periyotları tam sayı olmalı.`;
  if (spec.name === "macd" && spec.fast === spec.slow) return `${side} MACD periyotları farklı olmalı.`;
  if ((spec.name === "bb" || spec.name === "keltner" || spec.name === "supertrend") && !(spec.mult >= 0)) return `${side} çarpan negatif olamaz.`;
  if (spec.name === "keltner" && !integerPeriod(spec.atrPeriod)) return `${side} Keltner ATR periyodu tam sayı olmalı.`;
  if (spec.name === "stoch" && !integerPeriod(spec.smooth)) return `${side} Stochastic yumuşatma tam sayı olmalı.`;
  return null;
}

function activeConditions(groups: ConditionGroup[] | undefined, flat: Condition[]) {
  if (groups && groups.length) return groups.flatMap((group) => group.conditions);
  return flat;
}

function rulesError(rules: StrategyRules): string | null {
  const buy = activeConditions(rules.buyGroups, rules.buy);
  if (!buy.length) return "En az bir AL koşulu gerekli.";
  if (rules.buyJoin !== "and" && rules.buyJoin !== "or") return "AL birleştirme VE veya VEYA olmalı.";
  if (rules.sellJoin !== "and" && rules.sellJoin !== "or") return "SAT birleştirme VE veya VEYA olmalı.";
  for (const group of [...(rules.buyGroups ?? []), ...(rules.sellGroups ?? [])]) {
    if (group.join !== "and" && group.join !== "or") return "Grup birleştirmesi VE veya VEYA olmalı.";
  }
  for (const condition of buy) {
    const issue = conditionError(condition, "AL");
    if (issue) return issue;
  }
  for (const condition of activeConditions(rules.sellGroups, rules.sell)) {
    const issue = conditionError(condition, "SAT");
    if (issue) return issue;
  }
  return null;
}

function sideMet(groups: ConditionGroup[] | undefined, flat: Condition[], join: Join, index: number, cache: Cache) {
  if (groups && groups.length) {
    const flags = groups.map((group) => groupMet(group.conditions, group.join, index, cache));
    return join === "and" ? flags.every(Boolean) : flags.some(Boolean);
  }
  return groupMet(flat, join, index, cache);
}

export function backtestRules(bars: OhlcBar[], rules: StrategyRules, adjustment: string): StrategyReport {
  const indicators = indicatorSetup(rules);
  if (!indicators.studies?.length) delete indicators.studies;
  const spec: EmaCrossSpec = {
    fast: indicators.emas[0] ?? 1,
    slow: indicators.emas[1] ?? Math.max(2, (indicators.emas[0] ?? 1) + 1),
    capital: rules.capital,
    allocation: rules.allocation,
    feeRate: rules.feeRate,
    slippageRate: rules.slippageRate,
  };
  const issue = rulesError(rules) ?? riskError(rules.risk);
  if (issue) return invalidStrategy(spec, adjustment, issue, indicators);
  const cache = cacheFor(bars, indicators, listedConditions(rules));
  const signal = (index: number, inPosition: boolean) => {
    const buy = sideMet(rules.buyGroups, rules.buy, rules.buyJoin, index, cache);
    const sell = sideMet(rules.sellGroups, rules.sell, rules.sellJoin, index, cache);
    if (!inPosition && buy) return "buy" as const;
    if (inPosition && sell) return "sell" as const;
    return null;
  };
  if (rules.risk && isRiskActive(rules.risk)) return executeManagedLong(bars, spec, adjustment, signal, indicators, rules.risk);
  return executeLong(bars, spec, adjustment, signal, indicators);
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
  if (condition.kind === "atr-level") return `ATR ${condition.period}, ${condition.level} ${condition.relation === "above" ? "üzerinde" : "altında"}`;
  const opText: Record<CompareOp, string> = {
    above: "üzerinde",
    below: "altında",
    gt: "büyük",
    lt: "küçük",
    "cross-up": "yukarı kesiyor",
    "cross-down": "aşağı kesiyor",
    "break-prev-high": "önceki mumun yükseğini kırıyor",
    "break-prev-low": "önceki mumun düşüğünü kırıyor",
    "break-highest": `son ${condition.length} mumun yükseğini kırıyor`,
    "break-lowest": `son ${condition.length} mumun düşüğünü kırıyor`,
  };
  if (condition.op.startsWith("break-")) return `${operandText(condition.left)} ${opText[condition.op]}`;
  return `${operandText(condition.left)} ${opText[condition.op]} ${operandText(condition.right)}`;
}

function operandText(operand: Operand) {
  if (operand.source === "price") {
    const names = { open: "Açılış", high: "Yüksek", low: "Düşük", close: "Kapanış" };
    return names[operand.field];
  }
  if (operand.source === "constant") return String(operand.value);
  return studyLabel(operand.spec);
}

export function describeGroups(groups: ConditionGroup[] | undefined, flat: Condition[], join: Join) {
  if (!groups?.length) return flat.map(describeCondition).join(join === "and" ? " VE " : " VEYA ");
  return groups.map((group, index) => `Grup ${index + 1}: ${group.conditions.map(describeCondition).join(group.join === "and" ? " VE " : " VEYA ") || "boş"}`).join(join === "and" ? " ve " : " veya ");
}

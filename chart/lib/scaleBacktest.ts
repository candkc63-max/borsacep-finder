import { atr, ema } from "./indicators";
import {
  invalidStrategy,
  summarizeStrategy,
  type EmaCrossSpec,
  type ExitReason,
  type ScaleFill,
  type ScaleTarget,
  type SideSignal,
  type StopPoint,
  type StrategyIndicators,
  type StrategyReport,
  type StrategyTrade,
} from "./emaCross";
import type { OhlcBar } from "./parseOhlcv";
import {
  cappedShares,
  initialStop as stopFromRisk,
  initialTarget as targetFromRisk,
  nextTrailStop,
  riskBudgetShares,
  riskError,
  sharesForCash,
  type RiskSettings,
} from "./riskPlan";
import {
  addTriggered,
  positionRisk,
  scaleError,
  scaleExitShares,
  splitEntryShares,
  type ScaleSettings,
} from "./scalePlan";

/**
 * Kademeli long. executeLong ve executeManagedLong döngülerine dokunmaz.
 * Öncelik: açılışta stop boşluğu, sonra hedef boşlukları, sonra sinyal satışı,
 * sonra kademeli alış. Mum içinde stop ve hedef birlikteyse stop kazanır.
 * Bir satıştan sonra aynı döngüde yeni kademe alınmaz.
 */
export function executeScaledLong(
  bars: OhlcBar[],
  spec: EmaCrossSpec,
  adjustment: string,
  signal: (index: number, inPosition: boolean) => SideSignal,
  indicators: StrategyIndicators,
  risk: RiskSettings,
  scale: ScaleSettings,
): StrategyReport {
  const issue = scaleError(scale) ?? riskError(risk);
  if (issue) return invalidStrategy(spec, adjustment, issue, indicators);
  if (!(spec.capital > 0)) return invalidStrategy(spec, adjustment, "Başlangıç sermayesi sıfırdan büyük olmalı.", indicators);
  if (!(spec.allocation > 0) || spec.allocation > 1) return invalidStrategy(spec, adjustment, "Pozisyon büyüklüğü yüzde 1 ile 100 arasında olmalı.", indicators);
  if (!(spec.feeRate >= 0) || !(spec.slippageRate >= 0)) return invalidStrategy(spec, adjustment, "Komisyon ve kayma negatif olamaz.", indicators);
  if (!bars.length) return invalidStrategy(spec, adjustment, "Mum serisi boş.", indicators);
  let previous: string | null = null;
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const prices = [bar.open, bar.high, bar.low, bar.close];
    if (!prices.every((value) => Number.isFinite(value))) return invalidStrategy(spec, adjustment, `${index + 1}. mumda sayı olmayan fiyat var.`, indicators);
    if (bar.low > bar.high) return invalidStrategy(spec, adjustment, `${index + 1}. mumda düşük, yüksekten büyük.`, indicators);
    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      return invalidStrategy(spec, adjustment, `${index + 1}. mumun yüksek/düşük değeri açılış ve kapanışla uyuşmuyor.`, indicators);
    }
    if (!bar.time) return invalidStrategy(spec, adjustment, `${index + 1}. mumun zamanı yok.`, indicators);
    if (previous != null && bar.time <= previous) return invalidStrategy(spec, adjustment, `${index + 1}. mumun zamanı bir öncekinden ileri değil.`, indicators);
    previous = bar.time;
  }

  const closes = bars.map((bar) => bar.close);
  const fast = scale.trigger === "ema" ? ema(closes, scale.emaFast) : [];
  const slow = scale.trigger === "ema" ? ema(closes, scale.emaSlow) : [];
  const triggerAtr = scale.trigger === "atr" ? atr(bars, scale.atrPeriod) : [];
  const stopAtr = risk.stop === "atr" ? atr(bars, risk.atrPeriod) : [];
  const trailAtr = risk.trail === "atr" ? atr(bars, risk.trailAtrPeriod) : [];
  const trades: StrategyTrade[] = [];
  const equity: number[] = [];
  let cash = spec.capital;
  let shares = 0;
  let average = 0;
  let entryCommission = 0;
  let commissionPool = 0;
  let booked = 0;
  let slippage = 0;
  let exitCommission = 0;
  let stop: number | null = null;
  let highest = 0;
  let stopPath: StopPoint[] = [];
  let entries: ScaleFill[] = [];
  let exits: ScaleFill[] = [];
  let targets: ScaleTarget[] = [];
  let riskPath: { index: number; risk: number }[] = [];
  let plan: number[] = [];
  let nextStage = 0;
  let reference: number | null = null;
  let distributed = false;
  let maxShares = 0;
  let maxRisk = 0;
  let seq = 0;
  let entryIndex = -1;
  let signalIndex = -1;
  let initialStop: number | null = null;
  let pending: { kind: "buy" | "add" | "sell"; signalIndex: number } | null = null;
  let blocked = false;

  function rememberRisk(index: number) {
    const riskValue = positionRisk(shares, average, stop, spec.feeRate, spec.slippageRate);
    riskPath.push({ index, risk: riskValue });
    if (riskValue > maxRisk) maxRisk = riskValue;
    const trade = trades[trades.length - 1];
    if (trade) {
      trade.maxRisk = maxRisk;
      trade.legs = { entries: entries.slice(), exits: exits.slice(), targets: targets.slice(), riskPath: riskPath.slice() };
    }
  }

  function sync(open: boolean, reason: ExitReason | null, exitAt: number | null, exitPrice: number | null, exitSignal: number | null) {
    const trade = trades[trades.length - 1];
    if (!trade) return;
    trade.entryPrice = average;
    trade.shares = open ? shares : maxShares;
    trade.entryCommission = entryCommission;
    trade.exitCommission = exits.length ? exitCommission : null;
    trade.realized = open ? null : booked;
    trade.booked = open ? booked : undefined;
    trade.exitIndex = open ? null : exitAt;
    trade.exitPrice = open ? null : exitPrice;
    trade.exitSignalIndex = open ? null : exitSignal;
    trade.exitReason = open ? undefined : reason ?? undefined;
    trade.slippageCost = slippage;
    trade.stopPath = stopPath.slice();
    trade.initialStop = initialStop;
    trade.activeTarget = open ? targets.find((level) => stageOpen(level))?.price ?? null : null;
    trade.maxShares = maxShares;
    trade.maxRisk = maxRisk;
    trade.legs = { entries: entries.slice(), exits: exits.slice(), targets: targets.slice(), riskPath: riskPath.slice() };
  }

  function stageOpen(level: ScaleTarget) {
    return level.filledIndex == null;
  }

  function refreshTargets() {
    targets = targets.map((level) => {
      if (level.filledIndex != null || level.profitPercent == null) return level;
      return { ...level, price: average * (1 + level.profitPercent) };
    });
  }

  function markShares() {
    if (shares > maxShares) maxShares = shares;
  }

  function buy(index: number, raw: number, qty: number, reason: "entry" | "add", armed: number) {
    const fill = raw * (1 + spec.slippageRate);
    const commission = qty * fill * spec.feeRate;
    cash -= qty * fill + commission;
    average = shares === 0 ? fill : (average * shares + fill * qty) / (shares + qty);
    shares += qty;
    entryCommission += commission;
    commissionPool += commission;
    slippage += qty * (fill - raw);
    entries.push({ seq: seq += 1, index, signalIndex: armed, price: fill, shares: qty, commission, slippage: qty * (fill - raw), reason });
    markShares();
  }

  function sell(index: number, raw: number, qty: number, reason: ExitReason, armed: number | null) {
    if (qty < 1 || shares < 1) return;
    const amount = Math.min(shares, qty);
    if (reference == null) reference = shares;
    const fill = raw * (1 - spec.slippageRate);
    const commission = amount * fill * spec.feeRate;
    const slice = commissionPool * amount / shares;
    commissionPool -= slice;
    const pnl = (fill - average) * amount - commission - slice;
    cash += amount * fill - commission;
    shares -= amount;
    booked += pnl;
    exitCommission += commission;
    slippage += amount * (raw - fill);
    exits.push({
      seq: seq += 1,
      index,
      signalIndex: armed ?? -1,
      price: fill,
      shares: amount,
      commission,
      slippage: amount * (raw - fill),
      reason,
    });
    distributed = true;
    if (shares === 0) {
      sync(false, reason, index, fill, reason === "signal" ? armed : null);
      resetPosition();
    } else sync(true, null, null, null, null);
  }

  function resetPosition() {
    shares = 0;
    average = 0;
    entryCommission = 0;
    commissionPool = 0;
    booked = 0;
    slippage = 0;
    exitCommission = 0;
    stop = null;
    highest = 0;
    stopPath = [];
    entries = [];
    exits = [];
    targets = [];
    riskPath = [];
    plan = [];
    nextStage = 0;
    reference = null;
    distributed = false;
    maxShares = 0;
    maxRisk = 0;
    entryIndex = -1;
    initialStop = null;
    seq = 0;
  }

  function raiseStop(index: number, price: number) {
    if (risk.stop === "none" || risk.stop === "price") return;
    const level = stopFromRisk(risk, bars, index, price, stopAtr);
    if (!level.ok || level.price == null || !(level.price < price)) return;
    const next = stop == null ? level.price : Math.max(stop, level.price);
    if (next !== stop) {
      stop = next;
      stopPath.push({ index, stop: next });
    }
  }

  function fitQty(index: number, fill: number, wanted: number, currentStop: number | null) {
    let qty = cappedShares(wanted, cash, fill, spec.feeRate);
    const cap = scale.maxRiskPercent ?? (risk.size === "risk" ? risk.riskPercent : null);
    if (cap == null) return qty;
    const equity = shares === 0 ? cash : cash + shares * bars[index - 1].close;
    while (qty >= 1) {
      const nextAverage = shares === 0 ? fill : (average * shares + fill * qty) / (shares + qty);
      let nextStop = currentStop;
      if (risk.stop !== "none" && risk.stop !== "price") {
        const level = stopFromRisk(risk, bars, index, nextAverage, stopAtr);
        if (level.ok && level.price != null && level.price < fill) nextStop = currentStop == null ? level.price : Math.max(currentStop, level.price);
      }
      if (positionRisk(shares + qty, nextAverage, nextStop, spec.feeRate, spec.slippageRate) <= equity * cap + 1e-6) return qty;
      qty -= 1;
    }
    return 0;
  }

  function openFirst(index: number, armed: number) {
    const raw = bars[index].open;
    const fill = raw * (1 + spec.slippageRate);
    const stopLevel = stopFromRisk(risk, bars, index, fill, stopAtr);
    const targetLevel = stopLevel.ok ? targetFromRisk(risk, fill, stopLevel.price) : { ok: false as const };
    if (!stopLevel.ok || (!scale.exits.length && !targetLevel.ok)) return;
    const full = risk.size === "shares"
      ? cappedShares(risk.shares, cash, fill, spec.feeRate)
      : risk.size === "risk" && stopLevel.price != null
        ? riskBudgetShares(cash, risk.riskPercent, fill, stopLevel.price, spec.feeRate, spec.slippageRate, cash)
        : risk.size === "equity"
          ? sharesForCash(cash * spec.allocation, fill, spec.feeRate)
          : 0;
    plan = splitEntryShares(full, scale.entryRatios);
    const qty = fitQty(index, fill, plan[0] ?? 0, null);
    if (qty < 1) return;
    signalIndex = armed;
    entryIndex = index;
    entries = [];
    exits = [];
    booked = 0;
    slippage = 0;
    exitCommission = 0;
    entryCommission = 0;
    commissionPool = 0;
    maxShares = 0;
    maxRisk = 0;
    riskPath = [];
    stopPath = [];
    reference = null;
    distributed = false;
    buy(index, raw, qty, "entry", armed);
    stop = stopLevel.price;
    initialStop = stop;
    if (stop != null) stopPath = [{ index, stop }];
    highest = bars[index].high;
    nextStage = 1;
    targets = scale.exits.length
      ? scale.exits.map((stage) => ({ profitPercent: stage.profitPercent, ratio: stage.ratio, price: average * (1 + stage.profitPercent), filledIndex: null }))
      : targetLevel.ok && targetLevel.price != null
        ? [{ profitPercent: null, ratio: 1, price: targetLevel.price, filledIndex: null }]
        : [];
    trades.push({
      signalIndex: armed,
      entryIndex: index,
      exitSignalIndex: null,
      exitIndex: null,
      entryPrice: average,
      exitPrice: null,
      shares,
      entryCommission,
      exitCommission: null,
      realized: null,
      initialStop: stop,
      slippageCost: slippage,
    });
    rememberRisk(index);
    sync(true, null, null, null, null);
  }

  function openAdd(index: number, armed: number) {
    if (distributed || nextStage >= plan.length || nextStage < 1) {
      nextStage = Math.max(nextStage, plan.length);
      return;
    }
    const raw = bars[index].open;
    const fill = raw * (1 + spec.slippageRate);
    const qty = fitQty(index, fill, plan[nextStage] ?? 0, stop);
    nextStage += 1;
    if (qty < 1) return;
    buy(index, raw, qty, "add", armed);
    raiseStop(index, fill);
    refreshTargets();
    rememberRisk(index);
    sync(true, null, null, null, null);
  }

  function takeTargets(index: number, raw: number, reason: "target" | "gap-target", reached: (price: number) => boolean) {
    for (let level = 0; level < targets.length && shares > 0; level += 1) {
      const stage = targets[level];
      if (stage.filledIndex != null || !reached(stage.price)) continue;
      const last = level === targets.length - 1;
      const qty = scaleExitShares(reference ?? shares, stage.ratio, shares, last);
      targets[level] = { ...stage, filledIndex: index };
      if (qty < 1) continue;
      const price = reason === "gap-target" ? raw : stage.price;
      sell(index, price, qty, reason, null);
    }
  }

  function protect(index: number, afterOpen: boolean) {
    if (!shares) return;
    const bar = bars[index];
    if (!afterOpen && stop != null && bar.open <= stop + 1e-8) {
      sell(index, bar.open, shares, "gap-stop", null);
      blocked = true;
      return;
    }
    const pendingTarget = targets.find((level) => level.filledIndex == null);
    if (!afterOpen && pendingTarget && bar.open + 1e-8 >= pendingTarget.price) {
      takeTargets(index, bar.open, "gap-target", (price) => bar.open + 1e-8 >= price);
      if (!shares) {
        blocked = true;
        return;
      }
    }
    const stopHit = stop != null && bar.low <= stop + 1e-8;
    const targetHit = targets.some((stage) => stage.filledIndex == null && bar.high + 1e-8 >= stage.price);
    if (stopHit && targetHit) {
      sell(index, stop as number, shares, "stop", null);
      blocked = true;
      return;
    }
    if (stopHit) {
      sell(index, stop as number, shares, "stop", null);
      blocked = true;
      return;
    }
    if (targetHit) {
      takeTargets(index, 0, "target", (price) => bar.high + 1e-8 >= price);
      if (!shares) blocked = true;
    }
  }

  function arm(index: number) {
    const next = signal(index, shares > 0);
    if (next === "sell" && shares > 0) {
      pending = { kind: "sell", signalIndex: index };
      return;
    }
    if (next === "buy" && shares === 0) {
      pending = { kind: "buy", signalIndex: index };
      return;
    }
    if (shares > 0 && !distributed && nextStage < plan.length && entries.length) {
      const previousFill = entries[entries.length - 1].price;
      if (addTriggered(scale, bars, index, previousFill, entryIndex, fast, slow, triggerAtr)) {
        pending = { kind: "add", signalIndex: index };
      }
    }
  }

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    blocked = false;
    const kind = pending?.kind ?? null;
    const armed = pending?.signalIndex ?? -1;
    pending = null;
    if (kind === "sell" && shares > 0) {
      if (stop != null && bar.open <= stop) {
        sell(index, bar.open, shares, "gap-stop", null);
        blocked = true;
      } else if (targets.some((stage) => stage.filledIndex == null && bar.open + 1e-8 >= stage.price)) {
        protect(index, false);
      } else sell(index, bar.open, shares, "signal", armed);
    } else if (kind === "buy" && shares === 0) {
      openFirst(index, armed);
      if (shares > 0) protect(index, true);
    } else if (kind === "add" && shares > 0) {
      if (stop != null && bar.open <= stop) {
        sell(index, bar.open, shares, "gap-stop", null);
        blocked = true;
      } else if (targets.some((stage) => stage.filledIndex == null && bar.open + 1e-8 >= stage.price)) {
        protect(index, false);
      } else {
        openAdd(index, armed);
        if (shares > 0) protect(index, true);
      }
    } else if (shares > 0) protect(index, false);
    if (shares > 0) {
      if (bar.high > highest) highest = bar.high;
      const trail = nextTrailStop(stop, highest, risk, risk.trail === "atr" ? trailAtr[index] ?? null : null);
      if (trail != null && trail !== stop) {
        stop = trail;
        stopPath.push({ index, stop: trail });
        sync(true, null, null, null, null);
      }
    }
    if (!blocked && index < bars.length - 1) arm(index);
    equity.push(cash + shares * bar.close);
  }

  if (!blocked) arm(bars.length - 1);
  const hanging = pending ? { side: pending.kind === "sell" ? "sell" as const : "buy" as const, signalIndex: pending.signalIndex } : null;
  const buyFill = bars[0].open * (1 + spec.slippageRate);
  const buyShares = sharesForCash(spec.capital * spec.allocation, buyFill, spec.feeRate);
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

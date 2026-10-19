import { atr } from "./indicators";
import {
  invalidStrategy,
  summarizeStrategy,
  type EmaCrossSpec,
  type ExitReason,
  type SideSignal,
  type StopPoint,
  type StrategyIndicators,
  type StrategyReport,
  type StrategyTrade,
} from "./emaCross";
import type { OhlcBar } from "./parseOhlcv";
import {
  cappedShares,
  initialStop,
  initialTarget,
  nextTrailStop,
  protectiveExit,
  riskBudgetShares,
  riskError,
  sharesForCash,
  type RiskSettings,
} from "./riskPlan";

/**
 * Yalnız risk ayarı açıkken çalışır. executeLong döngüsüne dokunmaz.
 * Sıra: önceki kapanışın emri bu açılışta dolar; açık pozisyonun stop/hedefi
 * aynı mumun yüksek/düşüğünde kontrol edilir. Stop veya hedef kapanışı aynı
 * mumda yeni AL sinyali kurmaz. İz süren stop, mum kapandıktan sonra ve yalnız
 * yukarı güncellenir; o mumun kendi kontrolünde kullanılmaz.
 */
export function executeManagedLong(
  bars: OhlcBar[],
  spec: EmaCrossSpec,
  adjustment: string,
  signal: (index: number, inPosition: boolean) => SideSignal,
  indicators: StrategyIndicators,
  risk: RiskSettings,
): StrategyReport {
  const issue = riskError(risk);
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

  const stopAtr = risk.stop === "atr" ? atr(bars, risk.atrPeriod) : [];
  const trailAtr = risk.trail === "atr" ? atr(bars, risk.trailAtrPeriod) : [];
  const trades: StrategyTrade[] = [];
  const equity: number[] = [];
  let cash = spec.capital;
  let shares = 0;
  let entryPrice = 0;
  let entryCommission = 0;
  let entrySlip = 0;
  let stop: number | null = null;
  let target: number | null = null;
  let initialStopPrice: number | null = null;
  let initialTargetPrice: number | null = null;
  let highest = 0;
  let stopPath: StopPoint[] = [];
  let pending: "buy" | "sell" | null = null;
  let pendingIndex = -1;
  let blocked = false;

  function closeAt(index: number, raw: number, reason: ExitReason, signalIndex: number | null) {
    const fill = raw * (1 - spec.slippageRate);
    const commission = shares * fill * spec.feeRate;
    const exitSlip = shares * (raw - fill);
    const openTrade = trades[trades.length - 1];
    cash += shares * fill - commission;
    openTrade.exitSignalIndex = reason === "signal" ? signalIndex : null;
    openTrade.exitIndex = index;
    openTrade.exitPrice = fill;
    openTrade.exitCommission = commission;
    openTrade.realized = (fill - entryPrice) * shares - entryCommission - commission;
    openTrade.exitReason = reason;
    openTrade.slippageCost = entrySlip + exitSlip;
    openTrade.stopPath = stopPath.slice();
    shares = 0;
    entryPrice = 0;
    entryCommission = 0;
    entrySlip = 0;
    stop = null;
    target = null;
    highest = 0;
    stopPath = [];
  }

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    blocked = false;
    if (pending === "sell" && shares > 0) {
      const gap = protectiveExit(bar, stop, target);
      if (gap && (gap.reason === "gap-stop" || gap.reason === "gap-target")) {
        closeAt(index, gap.price, gap.reason, null);
        blocked = true;
      } else {
        closeAt(index, bar.open, "signal", pendingIndex);
      }
    } else if (pending === "buy" && shares === 0) {
      const fill = bar.open * (1 + spec.slippageRate);
      const equityNow = cash;
      const stopLevel = initialStop(risk, bars, index, fill, stopAtr);
      const targetLevel = stopLevel.ok ? initialTarget(risk, fill, stopLevel.price) : { ok: false as const };
      const qty = !stopLevel.ok || !targetLevel.ok
        ? 0
        : risk.size === "shares"
          ? cappedShares(risk.shares, cash, fill, spec.feeRate)
          : risk.size === "risk" && stopLevel.price != null
            ? riskBudgetShares(equityNow, risk.riskPercent, fill, stopLevel.price, spec.feeRate, spec.slippageRate, cash)
            : risk.size === "equity"
              ? sharesForCash(cash * spec.allocation, fill, spec.feeRate)
              : 0;
      if (qty >= 1 && stopLevel.ok && targetLevel.ok) {
        const commission = qty * fill * spec.feeRate;
        cash -= qty * fill + commission;
        shares = qty;
        entryPrice = fill;
        entryCommission = commission;
        entrySlip = qty * (fill - bar.open);
        stop = stopLevel.price;
        target = targetLevel.price;
        initialStopPrice = stopLevel.price;
        initialTargetPrice = targetLevel.price;
        highest = bar.high;
        stopPath = stop != null ? [{ index, stop }] : [];
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
          initialStop: initialStopPrice,
          initialTarget: initialTargetPrice,
          slippageCost: entrySlip,
          stopPath: stopPath.slice(),
        });
        const hit = protectiveExit(bar, stop, target);
        if (hit) {
          closeAt(index, hit.price, hit.reason, null);
          blocked = true;
        }
      }
    } else if (shares > 0) {
      const hit = protectiveExit(bar, stop, target);
      if (hit) {
        closeAt(index, hit.price, hit.reason, null);
        blocked = true;
      }
    }
    pending = null;
    if (shares > 0) {
      if (bar.high > highest) highest = bar.high;
      const nextStop = nextTrailStop(stop, highest, risk, risk.trail === "atr" ? trailAtr[index] ?? null : null);
      if (nextStop != null && nextStop !== stop) {
        stop = nextStop;
        stopPath.push({ index, stop: nextStop });
        trades[trades.length - 1].stopPath = stopPath.slice();
      }
    }
    if (!blocked && index < bars.length - 1) {
      const next = signal(index, shares > 0);
      if (next === "buy" && shares === 0) {
        pending = "buy";
        pendingIndex = index;
      } else if (next === "sell" && shares > 0) {
        pending = "sell";
        pendingIndex = index;
      }
    }
    equity.push(cash + shares * bar.close);
  }

  const lastSignal = blocked ? null : signal(bars.length - 1, shares > 0);
  const hanging = lastSignal
    ? { side: lastSignal, signalIndex: bars.length - 1 }
    : pending
      ? { side: pending, signalIndex: pendingIndex }
      : null;
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

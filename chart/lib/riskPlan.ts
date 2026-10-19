import type { OhlcBar } from "./parseOhlcv";

/**
 * Risk hesabı grafik bileşeninden bağımsızdır.
 * Aynı mumda stop ve hedef birlikte görülürse sıra OHLC'den bilinemez.
 * Politika, manuel motordaki gibi stop-first: önce açılış boşluğu, sonra stop.
 * Açılış stopun ötesindeyse gerçekleşme stop fiyatında değil, açılıştadır.
 */
export const SAME_BAR_POLICY = "stop-first" as const;

export type StopKind = "none" | "percent" | "price" | "atr" | "swing";
export type TargetKind = "none" | "percent" | "price" | "rr";
export type TrailKind = "off" | "percent" | "atr";
export type SizeKind = "shares" | "equity" | "risk";

export type RiskSettings = {
  stop: StopKind;
  stopPercent: number;
  stopPrice: number;
  atrPeriod: number;
  atrMult: number;
  swingBars: number;
  target: TargetKind;
  targetPercent: number;
  targetPrice: number;
  rewardMultiple: number;
  trail: TrailKind;
  trailPercent: number;
  trailAtrPeriod: number;
  trailAtrMult: number;
  size: SizeKind;
  shares: number;
  riskPercent: number;
};

/** Arayüz yüzdeleri 1 = %1 olarak tutar. Motor oran bekler. */
export type RiskDraft = {
  stop: StopKind;
  stopPercent: number;
  stopPrice: number;
  atrPeriod: number;
  atrMult: number;
  swingBars: number;
  target: TargetKind;
  targetPercent: number;
  targetPrice: number;
  rewardMultiple: number;
  trail: TrailKind;
  trailPercent: number;
  trailAtrPeriod: number;
  trailAtrMult: number;
  size: SizeKind;
  shares: number;
  riskPercent: number;
};

export type LevelResult = { ok: true; price: number | null } | { ok: false };

export type ProtectiveHit = {
  price: number;
  reason: "stop" | "target" | "gap-stop" | "gap-target";
};

const STOPS = new Set<StopKind>(["none", "percent", "price", "atr", "swing"]);
const TARGETS = new Set<TargetKind>(["none", "percent", "price", "rr"]);
const TRAILS = new Set<TrailKind>(["off", "percent", "atr"]);
const SIZES = new Set<SizeKind>(["shares", "equity", "risk"]);

export function defaultRiskDraft(): RiskDraft {
  return {
    stop: "none",
    stopPercent: 1,
    stopPrice: 0,
    atrPeriod: 14,
    atrMult: 2,
    swingBars: 5,
    target: "none",
    targetPercent: 2,
    targetPrice: 0,
    rewardMultiple: 2,
    trail: "off",
    trailPercent: 1,
    trailAtrPeriod: 14,
    trailAtrMult: 2,
    size: "equity",
    shares: 1,
    riskPercent: 1,
  };
}

export function inactiveSettings(): RiskSettings {
  return settingsFromDraft(defaultRiskDraft());
}

export function settingsFromDraft(draft: RiskDraft): RiskSettings {
  return {
    ...draft,
    stopPercent: draft.stopPercent / 100,
    targetPercent: draft.targetPercent / 100,
    trailPercent: draft.trailPercent / 100,
    riskPercent: draft.riskPercent / 100,
  };
}

export function isRiskActive(risk: RiskSettings | undefined | null): boolean {
  if (!risk) return false;
  const stop = risk.stop ?? "none";
  const target = risk.target ?? "none";
  const trail = risk.trail ?? "off";
  const size = risk.size ?? "equity";
  return stop !== "none" || target !== "none" || trail !== "off" || size !== "equity";
}

function integerAtLeast(value: number, minimum: number) {
  return Number.isInteger(value) && value >= minimum;
}

export function riskError(risk: RiskSettings | undefined | null): string | null {
  if (!risk || !isRiskActive(risk)) return null;
  if (!STOPS.has(risk.stop) || !TARGETS.has(risk.target) || !TRAILS.has(risk.trail) || !SIZES.has(risk.size)) {
    return "Risk ayarı tanınmıyor.";
  }
  if (risk.stop === "percent" && (!(risk.stopPercent > 0) || !(risk.stopPercent < 1))) return "Stop yüzdesi 0 ile 100 arasında olmalı.";
  if (risk.stop === "price" && !(risk.stopPrice > 0)) return "Stop fiyatı sıfırdan büyük olmalı.";
  if (risk.stop === "atr" && (!integerAtLeast(risk.atrPeriod, 1) || !(risk.atrMult > 0))) return "ATR periyodu tam sayı, çarpan sıfırdan büyük olmalı.";
  if (risk.stop === "swing" && !integerAtLeast(risk.swingBars, 1)) return "Swing mum sayısı en az 1 olmalı.";
  if (risk.target === "percent" && !(risk.targetPercent > 0)) return "Hedef yüzdesi sıfırdan büyük olmalı.";
  if (risk.target === "price" && !(risk.targetPrice > 0)) return "Hedef fiyatı sıfırdan büyük olmalı.";
  if (risk.target === "rr" && !(risk.rewardMultiple > 0)) return "Risk/ödül çarpanı sıfırdan büyük olmalı.";
  if (risk.target === "rr" && risk.stop === "none") return "Risk/ödül hedefi için başlangıç stopu gerekli.";
  if (risk.trail === "percent" && (!(risk.trailPercent > 0) || !(risk.trailPercent < 1))) return "İz süren stop yüzdesi 0 ile 100 arasında olmalı.";
  if (risk.trail === "atr" && (!integerAtLeast(risk.trailAtrPeriod, 1) || !(risk.trailAtrMult > 0))) return "İz süren ATR periyodu tam sayı, çarpan sıfırdan büyük olmalı.";
  if (risk.size === "shares" && (!integerAtLeast(risk.shares, 1))) return "Sabit adet en az 1 tam sayı olmalı.";
  if (risk.size === "risk" && (!(risk.riskPercent > 0) || risk.riskPercent > 1)) return "İşlem riski yüzde 0 ile 100 arasında olmalı.";
  if (risk.size === "risk" && risk.stop === "none") return "Risk yüzdesi için başlangıç stopu gerekli.";
  return null;
}

export function sharesForCash(cash: number, fill: number, feeRate: number) {
  if (!(fill > 0) || !(cash > 0)) return 0;
  const unit = fill * (1 + feeRate);
  let shares = Math.floor((cash + 1e-9) / unit);
  while (shares > 0 && shares * unit > cash + 1e-8) shares -= 1;
  return shares;
}

export function cappedShares(requested: number, cash: number, fill: number, feeRate: number) {
  if (!(requested >= 1) || !(fill > 0)) return 0;
  const affordable = sharesForCash(cash, fill, feeRate);
  return Math.min(Math.floor(requested + 1e-9), affordable);
}

/** Risk bütçesi / (giriş ile başlangıç stopu arası, komisyon ve kayma dahil). Nakit ayrıca sınırlar. */
export function riskBudgetShares(equity: number, riskPercent: number, entryFill: number, stopPrice: number, feeRate: number, slippageRate: number, cash: number) {
  const budget = equity * riskPercent;
  const stopFill = stopPrice * (1 - slippageRate);
  const perShare = (entryFill - stopFill) + feeRate * (entryFill + stopFill);
  if (!(perShare > 0) || !(budget > 0)) return 0;
  let shares = Math.floor((budget + 1e-9) / perShare);
  while (shares > 0 && shares * perShare > budget + 1e-8) shares -= 1;
  return cappedShares(shares, cash, entryFill, feeRate);
}

export function initialStop(risk: RiskSettings, bars: OhlcBar[], entryIndex: number, entryFill: number, atrSeries: Array<number | null>): LevelResult {
  if (risk.stop === "none") return { ok: true, price: null };
  if (!(entryFill > 0)) return { ok: false };
  if (risk.stop === "percent") {
    const price = entryFill * (1 - risk.stopPercent);
    return price < entryFill ? { ok: true, price } : { ok: false };
  }
  if (risk.stop === "price") return risk.stopPrice < entryFill ? { ok: true, price: risk.stopPrice } : { ok: false };
  if (risk.stop === "atr") {
    const value = entryIndex > 0 ? atrSeries[entryIndex - 1] : null;
    if (value == null || !(value >= 0)) return { ok: false };
    const price = entryFill - risk.atrMult * value;
    return price < entryFill ? { ok: true, price } : { ok: false };
  }
  const count = risk.swingBars;
  if (entryIndex < count) return { ok: false };
  let low = Number.POSITIVE_INFINITY;
  for (let index = entryIndex - count; index < entryIndex; index += 1) low = Math.min(low, bars[index].low);
  return low < entryFill ? { ok: true, price: low } : { ok: false };
}

export function initialTarget(risk: RiskSettings, entryFill: number, stop: number | null): LevelResult {
  if (risk.target === "none") return { ok: true, price: null };
  if (risk.target === "percent") {
    const price = entryFill * (1 + risk.targetPercent);
    return price > entryFill ? { ok: true, price } : { ok: false };
  }
  if (risk.target === "price") return risk.targetPrice > entryFill ? { ok: true, price: risk.targetPrice } : { ok: false };
  if (stop == null || !(entryFill > stop)) return { ok: false };
  return { ok: true, price: entryFill + (entryFill - stop) * risk.rewardMultiple };
}

export function nextTrailStop(current: number | null, highest: number, risk: RiskSettings, atrValue: number | null): number | null {
  if (risk.trail === "off") return current;
  let candidate: number | null = null;
  if (risk.trail === "percent") candidate = highest * (1 - risk.trailPercent);
  if (risk.trail === "atr") {
    if (atrValue == null) return current;
    candidate = highest - risk.trailAtrMult * atrValue;
  }
  if (candidate == null || !Number.isFinite(candidate)) return current;
  if (current == null) return candidate;
  return Math.max(current, candidate);
}

export function protectiveExit(bar: Pick<OhlcBar, "open" | "high" | "low">, stop: number | null, target: number | null): ProtectiveHit | null {
  if (stop != null && bar.open <= stop) return { price: bar.open, reason: "gap-stop" };
  if (target != null && bar.open >= target) return { price: bar.open, reason: "gap-target" };
  const stopHit = stop != null && bar.low <= stop;
  const targetHit = target != null && bar.high >= target;
  if (stopHit && targetHit) return { price: stop as number, reason: "stop" };
  if (stopHit) return { price: stop as number, reason: "stop" };
  if (targetHit) return { price: target as number, reason: "target" };
  return null;
}

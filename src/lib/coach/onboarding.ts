/**
 * #10 Acemi Onboarding
 *
 * 5 soruluk minik wizard ile kullan\u0131c\u0131n\u0131n risk profilini \u00e7\u0131kar\u0131r.
 * Ko\u00e7 sonraki sohbetlerde bu profile g\u00f6re frenler/cesaret verir.
 */

export type OnboardingAnswerId =
  | "exp_new" | "exp_some" | "exp_pro"
  | "horizon_short" | "horizon_mid" | "horizon_long"
  | "risk_low" | "risk_mid" | "risk_high"
  | "goal_preserve" | "goal_income" | "goal_growth" | "goal_yolo"
  | "capital_small" | "capital_mid" | "capital_large";

export interface OnboardingQuestion {
  id: string;
  label: string;
  options: Array<{ id: OnboardingAnswerId; label: string }>;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "experience",
    label: "Piyasa deneyimin?",
    options: [
      { id: "exp_new", label: "Yeniyim (< 1 yıl)" },
      { id: "exp_some", label: "Biraz (1-3 yıl)" },
      { id: "exp_pro", label: "Deneyimli (3+ yıl)" },
    ],
  },
  {
    id: "horizon",
    label: "Yatırım vadesi?",
    options: [
      { id: "horizon_short", label: "Kısa (< 1 ay)" },
      { id: "horizon_mid", label: "Orta (1-12 ay)" },
      { id: "horizon_long", label: "Uzun (1+ yıl)" },
    ],
  },
  {
    id: "risk",
    label: "Risk toleransın?",
    options: [
      { id: "risk_low", label: "Düşük — uyku kaçmasın" },
      { id: "risk_mid", label: "Orta — makul dalgalanma tamam" },
      { id: "risk_high", label: "Yüksek — sert düşüş sorun değil" },
    ],
  },
  {
    id: "goal",
    label: "Asıl hedefin?",
    options: [
      { id: "goal_preserve", label: "Parayı enflasyondan koru" },
      { id: "goal_income", label: "Düzenli gelir" },
      { id: "goal_growth", label: "Uzun vadeli büyüme" },
      { id: "goal_yolo", label: "Hızlı büyük kazanç" },
    ],
  },
  {
    id: "capital",
    label: "Portföy büyüklüğü?",
    options: [
      { id: "capital_small", label: "< 100.000 TL" },
      { id: "capital_mid", label: "100.000 - 1.000.000 TL" },
      { id: "capital_large", label: "> 1.000.000 TL" },
    ],
  },
];

export interface OnboardingProfile {
  answers: Record<string, OnboardingAnswerId>;
  riskScore: number; // 1-10
  profile: "conservative" | "balanced" | "aggressive" | "speculator";
  completedAt: string;
}

export function scoreProfile(answers: Record<string, OnboardingAnswerId>): OnboardingProfile {
  let score = 5;

  switch (answers.experience) {
    case "exp_new": score -= 1; break;
    case "exp_pro": score += 1; break;
  }
  switch (answers.horizon) {
    case "horizon_short": score += 1; break;
    case "horizon_long": score -= 1; break;
  }
  switch (answers.risk) {
    case "risk_low": score -= 2; break;
    case "risk_high": score += 2; break;
  }
  switch (answers.goal) {
    case "goal_preserve": score -= 2; break;
    case "goal_income": score -= 1; break;
    case "goal_growth": score += 0; break;
    case "goal_yolo": score += 3; break;
  }

  score = Math.max(1, Math.min(10, score));

  const profile: OnboardingProfile["profile"] =
    score <= 3 ? "conservative"
      : score <= 6 ? "balanced"
        : score <= 8 ? "aggressive"
          : "speculator";

  return {
    answers,
    riskScore: score,
    profile,
    completedAt: new Date().toISOString(),
  };
}

export const PROFILE_LABEL: Record<OnboardingProfile["profile"], string> = {
  conservative: "Temkinli",
  balanced: "Dengeli",
  aggressive: "Agresif",
  speculator: "Spekülatör",
};

export const PROFILE_ADVICE: Record<OnboardingProfile["profile"], string> = {
  conservative:
    "Temkinli profilindesin. Temettü yoğun, sektör lideri, düşük volatiliteli hisseler önerilir. Portföy %70-80 blue chip + %20-30 nakit/tahvil mantıklı.",
  balanced:
    "Dengeli profilindesin. %60 blue chip + %25 büyüme + %15 nakit dağılımı makul. Stop disiplini şart.",
  aggressive:
    "Agresif profilindesin. Momentum + küçük-orta ölçek kombinasyonu olabilir ama pozisyon başına riski sınırla (%2-3).",
  speculator:
    "Spekülatör profilindesin. Dostum dikkat — bu profil en çok para kaybettiren profil. Eğer bu yolu seçersen her işlemde stop-loss ZORUNLU, kaldıraç YASAK, psikoloji günlüğü tut.",
};

const STORAGE_KEY = "borsacep-onboarding-profile-v1";

export function saveProfile(p: OnboardingProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("onboarding:changed"));
}

export function readProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("onboarding:changed"));
}

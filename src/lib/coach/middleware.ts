import type { CoachScenario } from "./types";

/**
 * Gerçekçi Beklenti Middleware — kullanıcı mesajını tarar,
 * gerçekçi olmayan kazanç beklentilerini (#11) yakalar ve scenario'yu
 * realistic_expectation'a çevirir. Böylece Koç otomatik olarak
 * frenlemeye başlar — kullanıcının ayrıca "gerçekçi ol" demesine gerek kalmaz.
 *
 * Pattern örnekleri:
 * - "2 ayda 2x"        → match
 * - "bir ayda %100"    → match
 * - "haftada %30"      → match
 * - "1 günde paramı 3'e katlamak" → match
 */
const TIME_WORDS = ["gün", "hafta", "ay", "yıl"];

export function detectUnrealisticExpectation(input: string): boolean {
  const s = input.toLowerCase();

  // Pattern 1: "Nx" ifadesi (2x, 3x, 10x)
  //   ve yakınında bir zaman kelimesi (gün, hafta, ay)
  const multMatch = s.match(/(\d+(?:[\.,]\d+)?)\s*x/);
  if (multMatch) {
    const mult = parseFloat(multMatch[1]!.replace(",", "."));
    if (mult >= 2 && hasShortTimeWord(s)) return true;
  }

  // Pattern 2: "paramı N'e katlamak"
  const katlaMatch = s.match(/param[ıi]?\s*(\d+)[\'']?[ea]?\s*katla/);
  if (katlaMatch) {
    const mult = parseInt(katlaMatch[1]!, 10);
    if (mult >= 2 && hasShortTimeWord(s)) return true;
  }

  // Pattern 3: "%N kazan" veya "%N kâr"
  //   kısa zaman dilimiyle birlikte
  const pctMatch = s.match(/[%%]\s*(\d+)/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1]!, 10);
    if (pct >= 50 && hasShortTimeWord(s)) return true;
    if (pct >= 30 && /hafta|gün/.test(s)) return true;
    if (pct >= 100) return true; // zaman belirtmese bile
  }

  // Pattern 4: yaygın tabirler
  if (/zengin\s*ol|köşeyi\s*dön|paray[ıi]\s*bas(ı|ı)|kesin\s*kazan/.test(s)) return true;

  return false;
}

function hasShortTimeWord(s: string): boolean {
  // "2 ay", "3 hafta", "1 yıl" gibi kısa vadeli zaman ifadesi
  for (const w of TIME_WORDS) {
    // "N kelime" formu — N 0-12 arası kabul edilebilir kısa vade
    const re = new RegExp(`\\d+\\s*${w}`, "i");
    if (re.test(s)) return true;
  }
  return false;
}

/**
 * Scenario override — middleware pattern yakaladıysa
 * mevcut scenario chat ise realistic_expectation'a çevir.
 */
export function applyExpectationMiddleware(
  currentScenario: CoachScenario,
  userText: string,
): CoachScenario {
  if (currentScenario !== "chat") return currentScenario;
  if (detectUnrealisticExpectation(userText)) return "realistic_expectation";
  return currentScenario;
}

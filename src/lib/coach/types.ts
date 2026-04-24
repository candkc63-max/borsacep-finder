/**
 * Koç — istemci tarafı tipleri.
 * Prompt + persona tamamen sunucu tarafında (supabase/functions/coach-chat).
 */

export type CoachScenario =
  | "chat"
  | "panic"
  | "fomo"
  | "journal_review"
  | "realistic_expectation"
  | "stop_loss_miss"
  | "scam_check";

export interface CoachPortfolioContext {
  totalPnlPct?: number;
  totalValueTl?: number;
  worstPosition?: { symbol: string; pnlPct: number };
}

export interface CoachContext {
  scenario?: CoachScenario;
  userName?: string;
  portfolio?: CoachPortfolioContext;
}

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

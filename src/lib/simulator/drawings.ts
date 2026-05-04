/**
 * Chart drawing tools — trend çizgisi, yatay/dikey çizgi, dikdörtgen, Fibonacci.
 * Her çizim 1 veya 2 noktadan oluşur. Nokta = (time, price).
 */

export type DrawingTool =
  | "trend_line"
  | "horizontal_line"
  | "vertical_line"
  | "rectangle"
  | "fib_retracement"
  | "free_text";

export interface DrawPoint {
  time: number; // unix seconds
  price: number;
}

export interface Drawing {
  id: string;
  tool: DrawingTool;
  points: DrawPoint[]; // 1 veya 2 nokta
  color: string;
  text?: string;
  createdAt: number;
}

const TOOL_REQUIRES_POINTS: Record<DrawingTool, number> = {
  trend_line: 2,
  horizontal_line: 1,
  vertical_line: 1,
  rectangle: 2,
  fib_retracement: 2,
  free_text: 1,
};

export function pointsNeeded(tool: DrawingTool): number {
  return TOOL_REQUIRES_POINTS[tool];
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function fibPriceLevels(p1: number, p2: number): Array<{ level: number; price: number }> {
  const range = p2 - p1;
  return FIB_LEVELS.map((l) => ({ level: l, price: p1 + range * l }));
}

export const TOOL_LABEL: Record<DrawingTool, string> = {
  trend_line: "Trend Çizgisi",
  horizontal_line: "Yatay Çizgi",
  vertical_line: "Dikey Çizgi",
  rectangle: "Dikdörtgen",
  fib_retracement: "Fibonacci",
  free_text: "Metin",
};

export const TOOL_DEFAULT_COLOR: Record<DrawingTool, string> = {
  trend_line: "#3b82f6",
  horizontal_line: "#a855f7",
  vertical_line: "#64748b",
  rectangle: "rgba(59, 130, 246, 0.15)",
  fib_retracement: "#f59e0b",
  free_text: "#94a3b8",
};

const STORAGE_PREFIX = "borsacep-sim-drawings-v1-";

export function loadDrawings(symbol: string): Drawing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + symbol);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Drawing[]) : [];
  } catch {
    return [];
  }
}

export function saveDrawings(symbol: string, drawings: Drawing[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + symbol, JSON.stringify(drawings));
  } catch {
    /* ignore */
  }
}

export function generateDrawingId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

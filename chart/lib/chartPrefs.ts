import type { ChartChoice } from "./chartSearch";

export type ChartPoint = { index: number; price: number };

export type Drawing =
  | { id: string; kind: "hline"; price: number }
  | { id: string; kind: "trend"; a: ChartPoint; b: ChartPoint }
  | { id: string; kind: "fib"; a: ChartPoint; b: ChartPoint }
  | { id: string; kind: "measure"; a: ChartPoint; b: ChartPoint };

export type ChartPrefs = {
  chartType: "mum" | "cizgi";
  ema5: boolean;
  ema8: boolean;
  ema13: boolean;
  rsi: boolean;
  grid: boolean;
  lastPrice: boolean;
  drawings: Drawing[];
};

export const DEFAULT_PREFS: ChartPrefs = {
  chartType: "mum",
  ema5: false,
  ema8: false,
  ema13: false,
  rsi: false,
  grid: true,
  lastPrice: true,
  drawings: [],
};

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function fibPrices(start: number, end: number) {
  return FIB_RATIOS.map((ratio) => ({
    ratio,
    price: end + (start - end) * ratio,
  }));
}

export function intervalsFor(choice: ChartChoice): Array<{ label: string; id: string; active: boolean }> {
  if (choice.id.startsWith("xu100-")) {
    return [
      { label: "1s", id: "xu100-1h", active: choice.id === "xu100-1h" },
      { label: "4s", id: "xu100-4h", active: choice.id === "xu100-4h" },
      { label: "1G", id: "xu100-1d", active: choice.id === "xu100-1d" },
      { label: "1H", id: "xu100-1wk", active: choice.id === "xu100-1wk" },
    ];
  }
  if (choice.id === "nas100-60") return [{ label: "60dk", id: "nas100-60", active: true }];
  if (choice.id === "ixic-1d") return [{ label: "1G", id: "ixic-1d", active: true }];
  return [{ label: "1G", id: choice.id, active: true }];
}

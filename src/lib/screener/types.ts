/**
 * BIST Temel Analiz Screener — tipler
 *
 * Mock data + Supabase shape uyumlu. fundamentals tablosu kurulunca
 * doğrudan select ile aynı shape gelir, mapping gereksiz.
 */

export interface Fundamental {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  market_cap: number | null;

  // Değerleme
  pe_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  ps_ratio: number | null;
  peg_ratio: number | null;

  // Karlılık (yüzde)
  roe: number | null;
  roa: number | null;
  net_margin: number | null;
  gross_margin: number | null;
  operating_margin: number | null;

  // Büyüme (yıllık %)
  revenue_growth: number | null;
  earnings_growth: number | null;
  ebitda_growth: number | null;

  // Bilanço sağlığı
  debt_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  net_debt_ebitda: number | null;

  // Temettü
  dividend_yield: number | null;
  payout_ratio: number | null;
  dividend_growth_5y: number | null;

  // Fiyat
  current_price: number | null;
  price_change_1y: number | null;
  price_52w_high: number | null;
  price_52w_low: number | null;

  data_source?: string;
  updated_at?: string;
}

export type NumericMetricKey =
  | "market_cap"
  | "pe_ratio" | "pb_ratio" | "ev_ebitda" | "ps_ratio" | "peg_ratio"
  | "roe" | "roa" | "net_margin" | "gross_margin" | "operating_margin"
  | "revenue_growth" | "earnings_growth" | "ebitda_growth"
  | "debt_equity" | "current_ratio" | "quick_ratio" | "net_debt_ebitda"
  | "dividend_yield" | "payout_ratio" | "dividend_growth_5y"
  | "price_change_1y";

export interface MetricRange {
  min?: number;
  max?: number;
}

export interface FilterState {
  sectors: string[];
  metrics: Partial<Record<NumericMetricKey, MetricRange>>;
  search?: string;
}

export const EMPTY_FILTERS: FilterState = {
  sectors: [],
  metrics: {},
  search: "",
};

export interface MetricMeta {
  key: NumericMetricKey;
  label: string;
  group: "Değerleme" | "Karlılık" | "Büyüme" | "Bilanço" | "Temettü" | "Fiyat" | "Genel";
  unit: "x" | "%" | "TL" | "";
  /** Daha düşük mü iyi (örn F/K, debt) — UI'da yön belirteci */
  lowerIsBetter?: boolean;
  /** Filter range slider için makul min/max */
  rangeMin: number;
  rangeMax: number;
  /** Slider step */
  step: number;
  /** Tabloda göstermek için format */
  format: (v: number | null) => string;
}

const fmtPct = (v: number | null): string => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtX = (v: number | null): string => (v == null ? "—" : `${v.toFixed(2)}x`);
const fmtRatio = (v: number | null): string => (v == null ? "—" : v.toFixed(2));
const fmtCap = (v: number | null): string => {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
  return v.toFixed(0);
};

export const METRICS: MetricMeta[] = [
  { key: "market_cap", label: "Piyasa Değeri", group: "Genel", unit: "TL", rangeMin: 0, rangeMax: 1_000_000_000_000, step: 1_000_000_000, format: fmtCap },
  { key: "pe_ratio", label: "F/K", group: "Değerleme", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 100, step: 0.5, format: fmtX },
  { key: "pb_ratio", label: "PD/DD", group: "Değerleme", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 20, step: 0.1, format: fmtX },
  { key: "ev_ebitda", label: "FD/FAVÖK", group: "Değerleme", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 50, step: 0.5, format: fmtX },
  { key: "ps_ratio", label: "PD/Satış", group: "Değerleme", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 20, step: 0.1, format: fmtX },
  { key: "peg_ratio", label: "PEG", group: "Değerleme", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 10, step: 0.1, format: fmtX },

  { key: "roe", label: "ROE", group: "Karlılık", unit: "%", rangeMin: -50, rangeMax: 100, step: 1, format: fmtPct },
  { key: "roa", label: "ROA", group: "Karlılık", unit: "%", rangeMin: -30, rangeMax: 50, step: 1, format: fmtPct },
  { key: "net_margin", label: "Net Marj", group: "Karlılık", unit: "%", rangeMin: -50, rangeMax: 80, step: 1, format: fmtPct },
  { key: "gross_margin", label: "Brüt Marj", group: "Karlılık", unit: "%", rangeMin: 0, rangeMax: 100, step: 1, format: fmtPct },
  { key: "operating_margin", label: "Operasyonel Marj", group: "Karlılık", unit: "%", rangeMin: -30, rangeMax: 70, step: 1, format: fmtPct },

  { key: "revenue_growth", label: "Satış Büyüme", group: "Büyüme", unit: "%", rangeMin: -50, rangeMax: 200, step: 1, format: fmtPct },
  { key: "earnings_growth", label: "Kar Büyüme", group: "Büyüme", unit: "%", rangeMin: -100, rangeMax: 300, step: 5, format: fmtPct },
  { key: "ebitda_growth", label: "FAVÖK Büyüme", group: "Büyüme", unit: "%", rangeMin: -50, rangeMax: 200, step: 1, format: fmtPct },

  { key: "debt_equity", label: "Borç/Özsermaye", group: "Bilanço", unit: "x", lowerIsBetter: true, rangeMin: 0, rangeMax: 5, step: 0.05, format: fmtRatio },
  { key: "current_ratio", label: "Cari Oran", group: "Bilanço", unit: "", rangeMin: 0, rangeMax: 5, step: 0.05, format: fmtRatio },
  { key: "quick_ratio", label: "Asit Test", group: "Bilanço", unit: "", rangeMin: 0, rangeMax: 5, step: 0.05, format: fmtRatio },
  { key: "net_debt_ebitda", label: "Net Borç/FAVÖK", group: "Bilanço", unit: "x", lowerIsBetter: true, rangeMin: -5, rangeMax: 10, step: 0.1, format: fmtRatio },

  { key: "dividend_yield", label: "Temettü Verimi", group: "Temettü", unit: "%", rangeMin: 0, rangeMax: 30, step: 0.1, format: fmtPct },
  { key: "payout_ratio", label: "Payout Oranı", group: "Temettü", unit: "%", lowerIsBetter: true, rangeMin: 0, rangeMax: 200, step: 1, format: fmtPct },
  { key: "dividend_growth_5y", label: "5Y Temettü Büyüme", group: "Temettü", unit: "%", rangeMin: -50, rangeMax: 100, step: 1, format: fmtPct },

  { key: "price_change_1y", label: "1Y Değişim", group: "Fiyat", unit: "%", rangeMin: -100, rangeMax: 500, step: 1, format: fmtPct },
];

export const METRIC_BY_KEY: Record<NumericMetricKey, MetricMeta> =
  Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<NumericMetricKey, MetricMeta>;

// =============================================================================
// HAZIR PRESET'LER
// =============================================================================

export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterState;
}

export const BUILTIN_PRESETS: ScreenerPreset[] = [
  {
    id: "buffett",
    name: "Buffett Tarzı",
    description: "Ucuz + sağlam + karlı: F/K<15, ROE>15%, Borç/Özsermaye<1, Net Marj>10%",
    filters: {
      sectors: [],
      metrics: {
        pe_ratio: { max: 15 },
        roe: { min: 15 },
        debt_equity: { max: 1 },
        net_margin: { min: 10 },
      },
    },
  },
  {
    id: "dividend_aristocrats",
    name: "Temettü Aristokratı",
    description: "Yüksek temettü, sürdürülebilir: Verim>4%, Payout<70%, 5Y büyüme>0",
    filters: {
      sectors: [],
      metrics: {
        dividend_yield: { min: 4 },
        payout_ratio: { max: 70 },
        dividend_growth_5y: { min: 0 },
      },
    },
  },
  {
    id: "growth",
    name: "Büyüme Hisseleri",
    description: "Hızlı büyüyen: Satış>20%, Kar>20%, ROE>20%",
    filters: {
      sectors: [],
      metrics: {
        revenue_growth: { min: 20 },
        earnings_growth: { min: 20 },
        roe: { min: 20 },
      },
    },
  },
  {
    id: "cheap_solid",
    name: "Ucuz ve Sağlam",
    description: "Defter altı + likit + az borç: PD/DD<1.5, Cari Oran>1.5, Net Borç/FAVÖK<2",
    filters: {
      sectors: [],
      metrics: {
        pb_ratio: { max: 1.5 },
        current_ratio: { min: 1.5 },
        net_debt_ebitda: { max: 2 },
      },
    },
  },
  {
    id: "garp",
    name: "GARP",
    description: "Makul fiyatla büyüme: PEG<1, ROE>15%, Kar Büyüme>15%",
    filters: {
      sectors: [],
      metrics: {
        peg_ratio: { max: 1 },
        roe: { min: 15 },
        earnings_growth: { min: 15 },
      },
    },
  },
];

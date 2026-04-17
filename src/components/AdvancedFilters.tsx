import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RsiZone = "oversold" | "neutral" | "overbought" | null;
export type MacdSignal = "bullish_cross" | "bearish_cross" | "positive" | "negative" | null;
export type EmaCrossSignal = "golden" | "death" | null;
export type BollingerSignal = "upper" | "lower" | "squeeze" | null;
export type VolumeSignal = "spike" | null;
export type IndexFilter = "BIST30" | "BIST50" | "BIST100" | "YILDIZ" | null;
export type MarketCapFilter = "small" | "mid" | "large" | null;
export type PeFilter = "low" | "mid" | "high" | null;
export type DivFilter = "none" | "low" | "mid" | "high" | null;

export interface AdvancedFilterState {
  rsi: RsiZone;
  macd: MacdSignal;
  emaCross: EmaCrossSignal;
  bollinger: BollingerSignal;
  volume: VolumeSignal;
  index: IndexFilter;
  marketCap: MarketCapFilter;
  pe: PeFilter;
  div: DivFilter;
}

export const emptyAdvancedFilters: AdvancedFilterState = {
  rsi: null, macd: null, emaCross: null, bollinger: null, volume: null, index: null,
  marketCap: null, pe: null, div: null,
};

interface Props {
  value: AdvancedFilterState;
  onChange: (v: AdvancedFilterState) => void;
}

interface Group<K extends keyof AdvancedFilterState> {
  key: K;
  label: string;
  options: { value: NonNullable<AdvancedFilterState[K]>; label: string; cls: string }[];
}

const groups: Group<keyof AdvancedFilterState>[] = [
  {
    key: "rsi",
    label: "RSI",
    options: [
      { value: "oversold", label: "Aşırı satım (<30)", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "neutral", label: "Nötr (30-70)", cls: "border-primary text-primary bg-primary/10" },
      { value: "overbought", label: "Aşırı alım (>70)", cls: "border-bearish text-bearish bg-bearish/10" },
    ],
  },
  {
    key: "macd",
    label: "MACD",
    options: [
      { value: "bullish_cross", label: "Pozitif kesişim", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "bearish_cross", label: "Negatif kesişim", cls: "border-bearish text-bearish bg-bearish/10" },
      { value: "positive", label: "Histogram pozitif", cls: "border-primary text-primary bg-primary/10" },
      { value: "negative", label: "Histogram negatif", cls: "border-muted-foreground text-muted-foreground bg-muted" },
    ],
  },
  {
    key: "emaCross",
    label: "EMA Kesişim (5/22 — bugün)",
    options: [
      { value: "golden", label: "Altın kesişim", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "death", label: "Ölüm kesişimi", cls: "border-bearish text-bearish bg-bearish/10" },
    ],
  },
  {
    key: "bollinger",
    label: "Bollinger (20,2)",
    options: [
      { value: "upper", label: "Üst banda temas", cls: "border-bearish text-bearish bg-bearish/10" },
      { value: "lower", label: "Alt banda temas", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "squeeze", label: "Sıkışma (dar bant)", cls: "border-yellow-500 text-yellow-500 bg-yellow-500/10" },
    ],
  },
  {
    key: "volume",
    label: "Hacim",
    options: [
      { value: "spike", label: "Patlama (20G ort. ≥ 2x)", cls: "border-yellow-500 text-yellow-500 bg-yellow-500/10" },
    ],
  },
  {
    key: "index",
    label: "Endeks Üyeliği",
    options: [
      { value: "BIST30", label: "BIST 30", cls: "border-primary text-primary bg-primary/10" },
      { value: "BIST50", label: "BIST 50", cls: "border-primary text-primary bg-primary/10" },
      { value: "BIST100", label: "BIST 100", cls: "border-primary text-primary bg-primary/10" },
      { value: "YILDIZ", label: "Yıldız Pazar", cls: "border-yellow-500 text-yellow-500 bg-yellow-500/10" },
    ],
  },
  {
    key: "marketCap",
    label: "Piyasa Değeri",
    options: [
      { value: "small", label: "Small Cap (<10B ₺)", cls: "border-primary text-primary bg-primary/10" },
      { value: "mid", label: "Mid Cap (10-50B ₺)", cls: "border-primary text-primary bg-primary/10" },
      { value: "large", label: "Large Cap (>50B ₺)", cls: "border-primary text-primary bg-primary/10" },
    ],
  },
  {
    key: "pe",
    label: "F/K Oranı",
    options: [
      { value: "low", label: "Düşük (<10)", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "mid", label: "Orta (10-20)", cls: "border-primary text-primary bg-primary/10" },
      { value: "high", label: "Yüksek (>20)", cls: "border-bearish text-bearish bg-bearish/10" },
    ],
  },
  {
    key: "div",
    label: "Temettü Verimi",
    options: [
      { value: "none", label: "Yok (%0)", cls: "border-muted-foreground text-muted-foreground bg-muted" },
      { value: "low", label: "Düşük (%0-3)", cls: "border-primary text-primary bg-primary/10" },
      { value: "mid", label: "Orta (%3-6)", cls: "border-bullish text-bullish bg-bullish/10" },
      { value: "high", label: "Yüksek (>%6)", cls: "border-bullish text-bullish bg-bullish/10" },
    ],
  },
];

export function AdvancedFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(value).filter(Boolean).length;

  const set = <K extends keyof AdvancedFilterState>(key: K, v: AdvancedFilterState[K]) => {
    onChange({ ...value, [key]: value[key] === v ? null : v });
  };
  const clearAll = () => onChange(emptyAdvancedFilters);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Gelişmiş Filtreler
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-mono">
              {activeCount}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t border-border p-3 space-y-3">
          {groups.map(g => (
            <div key={g.key} className="space-y-1.5">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {g.options.map(opt => {
                  const active = value[g.key] === opt.value;
                  return (
                    <button
                      key={opt.value as string}
                      onClick={() => set(g.key, opt.value as AdvancedFilterState[typeof g.key])}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
                        active ? opt.cls : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50 bg-background",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {activeCount > 0 && (
            <div className="pt-2 border-t border-border">
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground border border-border bg-background"
              >
                <X className="w-3 h-3" />
                Tümünü temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

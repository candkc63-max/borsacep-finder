import { Flame, TrendingDown, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTORS, type Sector } from "@/lib/sectors";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type Preset = "strong_buy" | "dip" | "momentum" | null;

interface QuickFiltersProps {
  onlyBuy: boolean;
  onlySell: boolean;
  onlyFavorites: boolean;
  sector: Sector | "ALL";
  preset: Preset;
  onToggleBuy: () => void;
  onToggleSell: () => void;
  onToggleFavorites: () => void;
  onSectorChange: (s: Sector | "ALL") => void;
  onPresetChange: (p: Preset) => void;
}

const presetMeta: Record<Exclude<Preset, null>, { label: string; icon: React.ReactNode; cls: string; desc: string }> = {
  strong_buy: {
    label: "Güçlü AL'lar",
    icon: <Flame className="w-3.5 h-3.5" />,
    cls: "border-bullish text-bullish bg-bullish/10",
    desc: "AL sinyali + günlük değişim ≥ %2",
  },
  dip: {
    label: "Dip fırsatları",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    cls: "border-primary text-primary bg-primary/10",
    desc: "AL sinyali + günlük değişim ≤ -%2",
  },
  momentum: {
    label: "Momentum",
    icon: <Zap className="w-3.5 h-3.5" />,
    cls: "border-yellow-500 text-yellow-500 bg-yellow-500/10",
    desc: "AL sinyali + ardışık 3 gün yükseliş",
  },
};

export function QuickFilters({
  onlyBuy, onlySell, onlyFavorites, sector, preset,
  onToggleBuy, onToggleSell, onToggleFavorites, onSectorChange, onPresetChange,
}: QuickFiltersProps) {
  const hasActive = onlyBuy || onlySell || onlyFavorites || sector !== "ALL" || preset !== null;

  const clearAll = () => {
    if (onlyBuy) onToggleBuy();
    if (onlySell) onToggleSell();
    if (onlyFavorites) onToggleFavorites();
    onSectorChange("ALL");
    onPresetChange(null);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider mr-1">Hazır:</span>
        {(Object.keys(presetMeta) as Array<Exclude<Preset, null>>).map((key) => {
          const m = presetMeta[key];
          const active = preset === key;
          return (
            <button
              key={key}
              onClick={() => onPresetChange(active ? null : key)}
              title={m.desc}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
                active ? m.cls : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50 bg-background",
              )}
            >
              {m.icon}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Toggles + sector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleBuy}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
            onlyBuy ? "bg-bullish/10 text-bullish border-bullish" : "border-border text-muted-foreground hover:text-foreground bg-background",
          )}
        >
          Sadece AL
        </button>
        <button
          onClick={onToggleSell}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
            onlySell ? "bg-bearish/10 text-bearish border-bearish" : "border-border text-muted-foreground hover:text-foreground bg-background",
          )}
        >
          Sadece SAT
        </button>
        <button
          onClick={onToggleFavorites}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold border transition-all",
            onlyFavorites ? "bg-yellow-400/10 text-yellow-500 border-yellow-400" : "border-border text-muted-foreground hover:text-foreground bg-background",
          )}
        >
          ★ Favorilerim
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Select value={sector} onValueChange={(v) => onSectorChange(v as Sector | "ALL")}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Sektör" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="ALL">Tüm Sektörler</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActive && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground border border-border bg-background"
              title="Filtreleri temizle"
            >
              <X className="w-3 h-3" />
              Temizle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

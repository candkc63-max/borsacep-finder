import { useEffect } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  totalBars: number;
  currentBarIdx: number;
  isPlaying: boolean;
  speedMs: number;
  onJump: (idx: number) => void;
  onStep: (delta: number) => void;
  onPlayPause: () => void;
  onSpeed: (ms: number) => void;
  onReset: () => void;
  currentDate?: string; // ISO string
}

const SPEEDS: Array<{ ms: number; label: string }> = [
  { ms: 2000, label: "0.5x" },
  { ms: 1000, label: "1x" },
  { ms: 500, label: "2x" },
  { ms: 200, label: "5x" },
  { ms: 50, label: "20x" },
];

export function ReplayControls({
  totalBars,
  currentBarIdx,
  isPlaying,
  speedMs,
  onJump,
  onStep,
  onPlayPause,
  onSpeed,
  onReset,
  currentDate,
}: Props) {
  // Klavye kısayolları
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Input alanına yazılırken çalışmasın
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onStep(1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onStep(-1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onPlayPause, onStep]);

  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <div className="flex items-center gap-2">
        {/* Reset / başa dön */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 w-8 p-0"
          title="Başa dön"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onJump(0)}
          className="h-8 w-8 p-0"
          title="En başa atla"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        {/* Step back */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onStep(-1)}
          disabled={currentBarIdx <= 0}
          className="h-8 w-8 p-0"
          title="Önceki mum (←)"
        >
          <StepBack className="h-3.5 w-3.5" />
        </Button>

        {/* Play / Pause */}
        <Button
          type="button"
          onClick={onPlayPause}
          size="sm"
          className="h-9 w-9 p-0"
          title="Oynat / Duraklat (Space)"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </Button>

        {/* Step forward */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onStep(1)}
          disabled={currentBarIdx >= totalBars - 1}
          className="h-8 w-8 p-0"
          title="Sonraki mum (→)"
        >
          <StepForward className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onJump(totalBars - 1)}
          className="h-8 w-8 p-0"
          title="Sona atla"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        {/* Hız */}
        <div className="ml-2 flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s.ms}
              type="button"
              onClick={() => onSpeed(s.ms)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                speedMs === s.ms
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tarih + bar sayacı */}
        <div className="ml-auto flex items-center gap-2 text-xs">
          {currentDate && (
            <span className="font-mono text-muted-foreground">
              {new Date(currentDate).toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span className="font-mono text-foreground">
            {currentBarIdx + 1} / {totalBars}
          </span>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={Math.max(0, totalBars - 1)}
        value={currentBarIdx}
        onChange={(e) => onJump(parseInt(e.target.value, 10))}
        className="mt-2 w-full accent-primary"
      />
    </div>
  );
}

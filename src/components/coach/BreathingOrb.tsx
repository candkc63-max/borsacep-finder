import { useEffect, useState } from "react";

type Phase = "inhale" | "hold" | "exhale";

const PHASE_MS: Record<Phase, number> = {
  inhale: 4000,
  hold: 7000,
  exhale: 8000,
};

const PHASE_LABEL: Record<Phase, string> = {
  inhale: "Nefes al (4 sn)",
  hold: "Tut (7 sn)",
  exhale: "Ver (8 sn)",
};

/**
 * 4-7-8 nefes egzersizi — panik modunda sakinleştirici animasyon.
 * Primary token kullanır, borsa101 temasına uyumlu.
 */
export function BreathingOrb() {
  const [phase, setPhase] = useState<Phase>("inhale");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase((p) => (p === "inhale" ? "hold" : p === "hold" ? "exhale" : "inhale"));
    }, PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  const scaleClass = phase === "exhale" ? "scale-50" : "scale-100";
  const durationClass =
    phase === "inhale"
      ? "duration-[4000ms]"
      : phase === "hold"
        ? "duration-300"
        : "duration-[8000ms]";

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full bg-primary/30 blur-2xl transition-transform ease-in-out ${scaleClass} ${durationClass}`}
        />
        <div
          className={`relative flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform ease-in-out ${scaleClass} ${durationClass}`}
        >
          <span className="text-xs font-medium">{PHASE_LABEL[phase]}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">4-7-8 nefes — birkaç döngü yap</p>
    </div>
  );
}

import { useState, useEffect } from "react";
import { GraduationCap, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorsaEgitmeni } from "./BorsaEgitmeni";
import { Koc } from "./Koc";
import type { CoachContext, CoachScenario } from "@/lib/coach/types";

type Tab = "egitmen" | "koc";

interface Props {
  /** Opsiyonel: hangi tab ile açılsın (örn. panik modundan geçiş) */
  initialTab?: Tab;
  /** Koç için portföy context'i */
  portfolioContext?: CoachContext["portfolio"];
  /** Koç'a başlangıçta otomatik seed mesaj */
  coachSeed?: { text: string; scenario: CoachScenario; key: string } | null;
  onCoachSeedConsumed?: () => void;
}

export function AiChatTabs({
  initialTab = "egitmen",
  portfolioContext,
  coachSeed,
  onCoachSeedConsumed,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // Seed geldiğinde Koç tab'ine atla
  useEffect(() => {
    if (coachSeed) setTab("koc");
  }, [coachSeed]);

  // initialTab değişirse (parent kontrolü) uygulansın
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-xl overflow-hidden shadow-lg">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-border bg-muted/40">
        <TabButton
          active={tab === "egitmen"}
          onClick={() => setTab("egitmen")}
          icon={<GraduationCap className="w-4 h-4" />}
          label="Eğitmen"
          sub="Teknik analiz"
        />
        <TabButton
          active={tab === "koc"}
          onClick={() => setTab("koc")}
          icon={<Compass className="w-4 h-4" />}
          label="Koç"
          sub="Psikoloji & disiplin"
        />
      </div>

      {/* Panel — her iki component kendi h-full kartını kaldırmadan embedded render ediyor.
          Container'ın zaten kendi border/rounded/shadow'u var; embedded component'lerin de var.
          İç component'leri dahili kart olmadan render etmek için her birini transparan wrapper'a sararız. */}
      <div className="flex-1 min-h-0 overflow-hidden [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
        {tab === "egitmen" ? (
          <BorsaEgitmeni embedded />
        ) : (
          <Koc
            embedded
            portfolioContext={portfolioContext}
            seed={coachSeed ?? null}
            onSeedConsumed={onCoachSeedConsumed}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-primary text-primary bg-background"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        <span className="text-[10px] font-normal text-muted-foreground/80">{sub}</span>
      </span>
    </button>
  );
}

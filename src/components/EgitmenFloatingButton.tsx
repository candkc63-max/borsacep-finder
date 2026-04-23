import { useEffect, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { AiChatTabs } from "./AiChatTabs";
import { cn } from "@/lib/utils";
import type { CoachContext, CoachScenario } from "@/lib/coach/types";

interface Props {
  /** Koç için portföy context (dashboard'dan geçilir) */
  portfolioContext?: CoachContext["portfolio"];
  /** Koç'a dışarıdan seed mesaj (örn. panik modundan "koçla konuşayım") */
  coachSeed?: { text: string; scenario: CoachScenario; key: string } | null;
  /** Seed geldiğinde otomatik aç */
  autoOpenOnSeed?: boolean;
  /** Seed işlendikten sonra parent bilgilendirilsin */
  onCoachSeedConsumed?: () => void;
}

export function EgitmenFloatingButton({
  portfolioContext,
  coachSeed,
  autoOpenOnSeed = true,
  onCoachSeedConsumed,
}: Props) {
  const [open, setOpen] = useState(false);

  // Seed geldiğinde paneli aç
  useEffect(() => {
    if (coachSeed && autoOpenOnSeed) setOpen(true);
  }, [coachSeed, autoOpenOnSeed]);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl flex items-center justify-center transition-all active:scale-95",
          open && "scale-90",
        )}
        aria-label={open ? "Paneli kapat" : "Eğitmen & Koç"}
      >
        {open ? <X className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-40 bg-background",
            "inset-x-2 top-2 bottom-24",
            "sm:inset-auto sm:bottom-24 sm:right-5 sm:top-auto sm:w-[460px] sm:h-[680px] sm:max-h-[82vh]",
          )}
        >
          <AiChatTabs
            portfolioContext={portfolioContext}
            coachSeed={coachSeed}
            onCoachSeedConsumed={onCoachSeedConsumed}
          />
        </div>
      )}
    </>
  );
}

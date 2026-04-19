import { useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { BorsaEgitmeni } from "./BorsaEgitmeni";
import { cn } from "@/lib/utils";

export function EgitmenFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl flex items-center justify-center transition-all active:scale-95",
          open && "scale-90"
        )}
        aria-label={open ? "Eğitmeni kapat" : "Borsa Eğitmeni'ne sor"}
      >
        {open ? <X className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-40 bg-background",
            // Mobile: full screen with safe spacing for the button
            "inset-x-2 top-2 bottom-24",
            // Desktop: floating panel above the button
            "sm:inset-auto sm:bottom-24 sm:right-5 sm:top-auto sm:w-[420px] sm:h-[640px] sm:max-h-[80vh]"
          )}
        >
          <BorsaEgitmeni embedded />
        </div>
      )}
    </>
  );
}

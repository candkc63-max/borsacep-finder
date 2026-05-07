import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, X, Sparkles, Wrench, User, BellRing, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_KEY = "borsa101-tour-done-v1";

type TourStep = {
  selector: string;
  title: string;
  body: string;
  icon: React.ReactNode;
};

const STEPS: TourStep[] = [
  {
    selector: "[data-tour=strategy]",
    title: "1. Strateji Seç",
    body: "Hangi vadede yatırım yapacağını seç (kısa / orta / uzun). Sistem sana o vadeye uygun BIST hisselerini tarar ve AL/SAT sinyali üretir.",
    icon: <Target className="w-4 h-4" />,
  },
  {
    selector: "[data-tour=tools]",
    title: "2. Araçlar Menüsü",
    body: "Buradan Temel Analiz Tarayıcı, Bar Replay Simülasyonu ve Video Kütüphanesi'ne ulaşırsın. Risk araçları (Scam, Makro) da burada.",
    icon: <Wrench className="w-4 h-4" />,
  },
  {
    selector: "[data-tour=account]",
    title: "3. Hesabım",
    body: "Portföyünü ekle, Trade Journal'a işlem yaz, Risk Profilini doldur. Disiplin Skoru burada hesaplanır.",
    icon: <User className="w-4 h-4" />,
  },
  {
    selector: "[data-tour=alerts]",
    title: "4. Alarmlar",
    body: "Hisse fiyat ve teknik alarmlarını buradan kur. Stop-Loss kaçırırsan koç sana yazıyor.",
    icon: <BellRing className="w-4 h-4" />,
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<DOMRect | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = document.querySelector(STEPS[step].selector);
      if (el) setTarget(el.getBoundingClientRect());
      else setTarget(null);
    };
    update();
    const el = document.querySelector(STEPS[step].selector);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, open]);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
  };
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());

  if (!open) return null;
  const current = STEPS[step];

  const tooltipStyle: React.CSSProperties = (() => {
    if (!target) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const top = target.bottom + 12;
    const width = 340;
    return { top, left: Math.max(12, Math.min(window.innerWidth - width - 12, target.right - width)) };
  })();

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[1px]" onClick={finish} />
      {target && (
        <div
          className="fixed z-[61] pointer-events-none rounded-md ring-4 ring-primary ring-offset-2 ring-offset-background"
          style={{ top: target.top - 4, left: target.left - 4, width: target.width + 8, height: target.height + 8 }}
        />
      )}
      <Card
        className={cn(
          "fixed z-[62] w-[340px] max-w-[calc(100vw-24px)] p-4 shadow-2xl border-primary/30",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
        style={tooltipStyle}
      >
        <button
          onClick={finish}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Turu kapat"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            {current.icon}
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Adım {step + 1} / {STEPS.length}
            </div>
            <h3 className="text-sm font-bold">{current.title}</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{current.body}</p>
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-1.5 bg-muted")} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={finish}>
            Atla
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={next}>
            {step < STEPS.length - 1 ? (
              <>Devam <ArrowRight className="w-3.5 h-3.5" /></>
            ) : (
              <>Başla <Sparkles className="w-3.5 h-3.5" /></>
            )}
          </Button>
        </div>
      </Card>
    </>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

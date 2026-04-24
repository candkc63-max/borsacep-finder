import { useEffect, useState } from "react";
import { Compass, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_QUESTIONS,
  PROFILE_ADVICE,
  PROFILE_LABEL,
  readProfile,
  saveProfile,
  scoreProfile,
  type OnboardingAnswerId,
  type OnboardingProfile,
} from "@/lib/coach/onboarding";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete?: (p: OnboardingProfile) => void;
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OnboardingAnswerId>>({});
  const [result, setResult] = useState<OnboardingProfile | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setAnswers({});
      setResult(null);
    } else {
      const existing = readProfile();
      if (existing) setResult(existing);
    }
  }, [open]);

  const questions = ONBOARDING_QUESTIONS;
  const currentQ = questions[step];
  const totalSteps = questions.length;

  function choose(id: OnboardingAnswerId) {
    const next = { ...answers, [currentQ!.id]: id };
    setAnswers(next);
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      const scored = scoreProfile(next);
      saveProfile(scored);
      setResult(scored);
      onComplete?.(scored);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Koç ile Tanışma</h2>
          </div>

          {!result ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {step + 1} / {totalSteps}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">{currentQ?.label}</p>
                <div className="space-y-2">
                  {currentQ?.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => choose(opt.id)}
                      className={cn(
                        "w-full text-left rounded-md border border-border bg-card px-3 py-2.5 text-sm transition-colors",
                        "hover:bg-primary/10 hover:border-primary/40",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => step > 0 && setStep(step - 1)}
                  disabled={step === 0}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Geri
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Sonra
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Risk Profilin
                </div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  {PROFILE_LABEL[result.profile]}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Risk skoru: {result.riskScore} / 10
                </div>
              </div>

              <div className="rounded-md border border-border p-3 text-sm leading-relaxed">
                {PROFILE_ADVICE[result.profile]}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={restart}>
                  Tekrar yap
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Tamam
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

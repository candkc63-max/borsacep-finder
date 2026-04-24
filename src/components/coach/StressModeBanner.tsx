import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StressSnapshot } from "@/lib/coach/stressMonitor";

interface Props {
  stress: StressSnapshot;
  onAskCoach: () => void;
}

/**
 * Stres seviyesi e\u015fik \u00fcst\u00fcndeyse banner g\u00f6ster.
 * Lock aktifse turuncu/k\u0131rm\u0131z\u0131, sadece uyar\u0131 ise sar\u0131.
 */
export function StressModeBanner({ stress, onAskCoach }: Props) {
  if (!stress.showWarning && !stress.isLocked) return null;

  const tone = stress.isLocked
    ? "border-bearish/50 bg-bearish/10"
    : "border-yellow-500/50 bg-yellow-500/10";
  const iconColor = stress.isLocked ? "text-bearish" : "text-yellow-600 dark:text-yellow-500";

  return (
    <div className={cn("rounded-lg border p-3 flex items-start gap-3", tone)}>
      <div className={cn("shrink-0 mt-0.5", iconColor)}>
        {stress.isLocked ? <Lock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-semibold", iconColor)}>
          {stress.isLocked
            ? "Stres modu aktif"
            : "Dostum çok kontrol ediyorsun"}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bugün {stress.checks}. kez kontrol ediyorsun ({stress.limit} üstü)
          {stress.isLocked
            ? " — 30 dakika yeni alım/satış kaydı açmayı bekletelim. Stresini düşür, nefes al."
            : ". Tarihsel olarak çok sık kontrol = panik kararı demek. Bir mola ver."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={onAskCoach}>
            Koç ile konuş
          </Button>
          {!stress.isLocked && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={stress.dismissToday}>
              Bugünlük kapat
            </Button>
          )}
          {stress.isLocked && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={stress.overrideLock}>
              Yine de devam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

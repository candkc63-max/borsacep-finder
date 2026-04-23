import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DisciplineBreakdown } from "@/lib/journal/discipline";

const GRADE_COLOR: Record<DisciplineBreakdown["grade"], string> = {
  A: "text-bullish",
  B: "text-bullish",
  C: "text-yellow-500",
  D: "text-orange-500",
  F: "text-bearish",
};

interface Props {
  breakdown: DisciplineBreakdown;
}

export function DisciplineCard({ breakdown }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Disiplin Skoru
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", GRADE_COLOR[breakdown.grade])}>
                {breakdown.score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <span
                className={cn("ml-1 text-2xl font-bold", GRADE_COLOR[breakdown.grade])}
              >
                {breakdown.grade}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Toplam: <span className="text-foreground">{breakdown.totalTrades}</span>
            </div>
            <div>
              Kapalı: <span className="text-foreground">{breakdown.closedTrades}</span>
            </div>
            {breakdown.closedTrades > 0 && (
              <div>
                Kazanç: <span className="text-foreground">%{breakdown.winRate.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>

        {breakdown.repeatedMistakes.length > 0 && (
          <div className="mt-3 rounded-md border border-bearish bg-bearish/10 p-2.5">
            <div className="mb-1 text-xs font-semibold text-bearish">
              Tekrar eden hatalar:
            </div>
            <ul className="text-xs text-bearish">
              {breakdown.repeatedMistakes.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>
        )}

        {breakdown.penalties.length > 0 && (
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Puan kırılımı ({breakdown.penalties.length})
            </summary>
            <ul className="mt-2 space-y-1 pl-2">
              {breakdown.penalties.map((p, i) => (
                <li key={i} className="flex justify-between">
                  <span>• {p.reason}</span>
                  <span className="text-bearish">-{p.points}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {breakdown.totalTrades === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Henüz işlem yok. Ekledikçe disiplin skoru hesaplanacak.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

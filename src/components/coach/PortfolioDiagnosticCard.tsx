import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioDiagnostic } from "@/lib/coach/portfolioDiagnostic";

interface Props {
  diagnostic: PortfolioDiagnostic;
  onAskCoach?: () => void;
}

function scoreColor(score: number): string {
  if (score < 25) return "text-bullish";
  if (score < 50) return "text-yellow-600 dark:text-yellow-500";
  if (score < 75) return "text-orange-500";
  return "text-bearish";
}

function scoreLabel(score: number): string {
  if (score < 25) return "Dengeli";
  if (score < 50) return "Kabul edilebilir";
  if (score < 75) return "Riskli";
  return "Yüksek risk";
}

export function PortfolioDiagnosticCard({ diagnostic, onAskCoach }: Props) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Portföy Dağılım Analizi</h3>
          </div>
          {onAskCoach && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAskCoach}>
              <Sparkles className="w-3 h-3 mr-1" />
              Koç yorumlasın
            </Button>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", scoreColor(diagnostic.concentrationScore))}>
            {diagnostic.concentrationScore}
          </span>
          <span className="text-xs text-muted-foreground">
            / 100 konsantrasyon riski
          </span>
          <span className={cn("ml-auto text-xs font-semibold", scoreColor(diagnostic.concentrationScore))}>
            {scoreLabel(diagnostic.concentrationScore)}
          </span>
        </div>

        {diagnostic.sectorBreakdown.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sektör dağılımı
            </div>
            {diagnostic.sectorBreakdown.slice(0, 5).map((s) => (
              <div key={s.sector} className="flex items-center gap-2 text-xs">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-foreground">{s.sector}</span>
                    <span className="font-mono text-muted-foreground">
                      %{s.weight.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, s.weight)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {diagnostic.flags.length > 0 && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2.5 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-yellow-600 dark:text-yellow-500 font-semibold">
              Dikkat
            </div>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5">
              {diagnostic.flags.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        {diagnostic.suggestions.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {diagnostic.suggestions.map((s, i) => (
              <p key={i}>→ {s}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function buildPortfolioSeed(diagnostic: PortfolioDiagnostic): string {
  const lines: string[] = [];
  lines.push("Portföy dağılım analizim:");
  lines.push(`- Konsantrasyon riski: ${diagnostic.concentrationScore}/100`);
  lines.push(`- Pozisyon sayısı: ${diagnostic.positionCount}`);
  if (diagnostic.topPositionSymbol) {
    lines.push(
      `- En büyük pozisyon: ${diagnostic.topPositionSymbol} (%${diagnostic.topPositionWeight.toFixed(0)})`,
    );
  }
  lines.push(`- Sektörler:`);
  for (const s of diagnostic.sectorBreakdown.slice(0, 5)) {
    lines.push(`  • ${s.sector}: %${s.weight.toFixed(0)} (${s.symbols.join(", ")})`);
  }
  if (diagnostic.flags.length > 0) {
    lines.push("");
    lines.push("Sistem bayrakları:");
    for (const f of diagnostic.flags) lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push(
    "Dostum, bu tabloya koçluk gözüyle bak. Hangi risk gözüme batıyor ve düzeltmek için ne yapmalıyım? Al/sat deme — ağırlık ve çeşitlendirme üzerine konuş.",
  );
  return lines.join("\n");
}

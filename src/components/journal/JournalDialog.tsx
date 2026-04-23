import { useMemo, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { calculateTradeResult, formatTl } from "@/lib/journal/calculator";
import { computeDiscipline } from "@/lib/journal/discipline";
import { useTradeJournal } from "@/lib/journal/storage";
import type { TradeEntry } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { AddTradeForm } from "./AddTradeForm";
import { CloseTradeDialog } from "./CloseTradeDialog";
import { DisciplineCard } from "./DisciplineCard";
import { TradeRow } from "./TradeRow";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestCoachReview?: (summary: string) => void;
}

export function JournalDialog({ open, onOpenChange, onRequestCoachReview }: Props) {
  const { trades, addTrade, updateTrade, deleteTrade } = useTradeJournal();
  const [showAdd, setShowAdd] = useState(false);
  const [closing, setClosing] = useState<TradeEntry | null>(null);

  const discipline = useMemo(() => computeDiscipline(trades), [trades]);
  const netPnlTotal = useMemo(
    () =>
      trades.reduce((sum, t) => {
        const r = calculateTradeResult(t);
        return r ? sum + r.netPnl : sum;
      }, 0),
    [trades],
  );

  function handleAnalyze() {
    if (!onRequestCoachReview || trades.length === 0) return;
    const summary = buildJournalSummary(trades, discipline, netPnlTotal);
    onRequestCoachReview(summary);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <div className="shrink-0 border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="w-5 h-5 text-primary" />
            Trade Journal
          </h2>
          <p className="text-xs text-muted-foreground">
            Disiplinin görünür olsun — koç tekrarlayan hataları yakalasın.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <DisciplineCard breakdown={discipline} />

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">
                  Net kâr/zarar (komisyon + BSMV dahil)
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    netPnlTotal >= 0 ? "text-bullish" : "text-bearish",
                  )}
                >
                  {formatTl(netPnlTotal)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={trades.length === 0 || !onRequestCoachReview}
                  onClick={handleAnalyze}
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Koç analiz etsin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdd((s) => !s)}
                >
                  {showAdd ? "Vazgeç" : "+ Yeni işlem"}
                </Button>
              </div>
            </div>
          </div>

          {showAdd && (
            <AddTradeForm
              onAdd={(t) => {
                addTrade(t);
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
            />
          )}

          <div className="space-y-2">
            {trades.length === 0 && !showAdd && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Henüz işlem kaydetmedin. İlk işlemini eklemek için{" "}
                <b className="text-foreground">+ Yeni işlem</b>&apos;e bas.
              </div>
            )}
            {trades.map((t) => (
              <TradeRow
                key={t.id}
                trade={t}
                onClose={setClosing}
                onDelete={deleteTrade}
              />
            ))}
          </div>
        </div>
      </DialogContent>

      {closing && (
        <CloseTradeDialog
          trade={closing}
          onClose={() => setClosing(null)}
          onSubmit={(patch) => {
            updateTrade(closing.id, patch);
            setClosing(null);
          }}
        />
      )}
    </Dialog>
  );
}

function buildJournalSummary(
  trades: TradeEntry[],
  discipline: ReturnType<typeof computeDiscipline>,
  netPnl: number,
): string {
  const recent = trades.slice(0, 10);
  const lines: string[] = [];

  lines.push(`Trade journal özeti — son ${recent.length} işlem:`);
  lines.push(`Disiplin skoru: ${discipline.score}/100 (${discipline.grade})`);
  lines.push(`Toplam net P&L: ${formatTl(netPnl)}`);
  lines.push(
    `Kazanç oranı: %${discipline.winRate.toFixed(0)} (${discipline.closedTrades} kapalı)`,
  );

  if (discipline.repeatedMistakes.length > 0) {
    lines.push(`\nTekrar eden desenler:`);
    for (const m of discipline.repeatedMistakes) lines.push(`- ${m}`);
  }

  lines.push(`\nİşlemler:`);
  for (const t of recent) {
    const r = calculateTradeResult(t);
    const pnlStr = r ? `net ${formatTl(r.netPnl)} (${r.netPnlPct.toFixed(1)}%)` : "açık";
    const reasonsStr = t.reasons?.length ? ` [${t.reasons.join(", ")}]` : "";
    lines.push(`- ${t.symbol} ${t.side} ${t.quantity}@${t.entryPrice} → ${pnlStr}${reasonsStr}`);
  }

  lines.push(
    `\nBu verilere bakarak tekrarlayan hatalarımı yüzüme vur. Hangi deseni değiştirmeliyim?`,
  );

  return lines.join("\n");
}

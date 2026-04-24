import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAlerts } from "@/lib/alerts/storage";
import type { AlertRule } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";
import { CreateAlertForm } from "./CreateAlertForm";

const KIND_LABEL: Record<AlertRule["kind"], string> = {
  fomo: "FOMO",
  stop_loss: "Stop-Loss",
  take_profit: "Kar Al",
  price_above: "Fiyat Üstü",
  price_below: "Fiyat Altı",
};

const STATUS_STYLE: Record<AlertRule["status"], string> = {
  armed: "bg-bullish/10 text-bullish",
  triggered: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
  disabled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<AlertRule["status"], string> = {
  armed: "aktif",
  triggered: "tetiklendi",
  disabled: "kapalı",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AlertCenter({ open, onOpenChange }: Props) {
  const { alerts, addAlert, deleteAlert, disableAlert, rearmAlert } = useAlerts();
  const [showCreate, setShowCreate] = useState(false);

  const grouped = {
    armed: alerts.filter((a) => a.status === "armed"),
    triggered: alerts.filter((a) => a.status === "triggered"),
    disabled: alerts.filter((a) => a.status === "disabled"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <div className="shrink-0 border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bell className="w-5 h-5 text-primary" />
            Alarm Merkezi
          </h2>
          <p className="text-xs text-muted-foreground">
            FOMO, stop-loss ve kar al alarmları. Journal&apos;a stop/target eklediğin pozisyonlar otomatik alarm üretir.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 flex-wrap">
            <div className="text-sm">
              <span className="text-bullish font-semibold">{grouped.armed.length}</span>
              <span className="text-muted-foreground"> aktif</span>
              <span className="mx-2 text-muted-foreground/50">·</span>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {grouped.triggered.length}
              </span>
              <span className="text-muted-foreground"> tetiklenmiş</span>
              <span className="mx-2 text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{grouped.disabled.length} kapalı</span>
            </div>
            <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? "Vazgeç" : "+ Yeni alarm"}
            </Button>
          </div>

          {showCreate && (
            <CreateAlertForm
              onSubmit={(rule) => {
                addAlert(rule);
                setShowCreate(false);
              }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          <Section
            title="Aktif Alarmlar"
            alerts={grouped.armed}
            onDisable={disableAlert}
            onDelete={deleteAlert}
            onRearm={rearmAlert}
          />
          <Section
            title="Tetiklenmiş"
            alerts={grouped.triggered}
            onDisable={disableAlert}
            onDelete={deleteAlert}
            onRearm={rearmAlert}
          />
          <Section
            title="Kapalı"
            alerts={grouped.disabled}
            onDisable={disableAlert}
            onDelete={deleteAlert}
            onRearm={rearmAlert}
          />

          {alerts.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henüz alarm yok. Journal&apos;a stop/target&apos;lı bir işlem ekle ya da yukarıdan manuel alarm kur.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  alerts,
  onDisable,
  onDelete,
  onRearm,
}: {
  title: string;
  alerts: AlertRule[];
  onDisable: (id: string) => void;
  onDelete: (id: string) => void;
  onRearm: (id: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {title} ({alerts.length})
      </h3>
      <div className="space-y-1.5">
        {alerts.map((a) => (
          <AlertRow
            key={a.id}
            alert={a}
            onDisable={onDisable}
            onDelete={onDelete}
            onRearm={onRearm}
          />
        ))}
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onDisable,
  onDelete,
  onRearm,
}: {
  alert: AlertRule;
  onDisable: (id: string) => void;
  onDelete: (id: string) => void;
  onRearm: (id: string) => void;
}) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/30">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{alert.symbol}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {KIND_LABEL[alert.kind]}
          </span>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px]", STATUS_STYLE[alert.status])}>
            {STATUS_LABEL[alert.status]}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {alert.kind === "fomo"
            ? `Referans: ${alert.referencePrice} · Eşik: +%${alert.pctThreshold}`
            : `Eşik: ${alert.threshold}`}
          {alert.triggeredPrice !== undefined && (
            <>
              {" · "}Tetikte:{" "}
              <span className="text-yellow-600 dark:text-yellow-500">
                {alert.triggeredPrice}
              </span>
            </>
          )}
        </div>
        {alert.note && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">{alert.note}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {alert.status === "armed" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDisable(alert.id)}
            className="h-7 text-xs"
          >
            Kapat
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRearm(alert.id)}
            className="h-7 text-xs text-primary"
          >
            Tekrar kur
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(alert.id)}
          className="h-7 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-bearish group-hover:opacity-100"
        >
          Sil
        </Button>
      </div>
    </div>
  );
}

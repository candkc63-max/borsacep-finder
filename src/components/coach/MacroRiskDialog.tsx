import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Sparkles } from "lucide-react";

const STORAGE_KEY = "borsacep-macro-snapshot-v1";

interface MacroSnapshot {
  usdTry?: string;
  cpiYoyPct?: string;
  tcmbRatePct?: string;
  bist100Trend?: "yukari" | "yatay" | "asagi" | "";
  politicalRisk?: "dusuk" | "orta" | "yuksek" | "";
  notes?: string;
  updatedAt?: string;
}

function read(): MacroSnapshot {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MacroSnapshot) : {};
  } catch {
    return {};
  }
}

function write(snap: MacroSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAskCoach: (text: string) => void;
}

/**
 * #9 Makro Risk Paneli
 *
 * Kullan\u0131c\u0131 haftal\u0131k/g\u00fcnl\u00fck makro g\u00f6r\u00fcnt\u00fc giriyor (USD/TRY, TÜFE, TCMB faizi,
 * endeks trendi, siyasi risk). Ko\u00e7 bu verilere bakarak BIST i\u00e7in risk t\u00fcr\u00fc + uyar\u0131 \u00fcretir.
 *
 * (\u0130leride: otomatik scraping. Şimdilik manuel + Koç özeti — çalışıyor ve canlıya gider.)
 */
export function MacroRiskDialog({ open, onOpenChange, onAskCoach }: Props) {
  const [snap, setSnap] = useState<MacroSnapshot>({});

  useEffect(() => {
    if (open) setSnap(read());
  }, [open]);

  function update<K extends keyof MacroSnapshot>(k: K, v: MacroSnapshot[K]) {
    setSnap((prev) => ({ ...prev, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const saved: MacroSnapshot = { ...snap, updatedAt: new Date().toISOString() };
    write(saved);

    const lines = ["Güncel makro görüntü (kullanıcı girişi):"];
    if (snap.usdTry) lines.push(`- USD/TRY: ${snap.usdTry}`);
    if (snap.cpiYoyPct) lines.push(`- Yıllık TÜFE: %${snap.cpiYoyPct}`);
    if (snap.tcmbRatePct) lines.push(`- TCMB politika faizi: %${snap.tcmbRatePct}`);
    if (snap.bist100Trend) lines.push(`- BIST100 trend: ${snap.bist100Trend}`);
    if (snap.politicalRisk) lines.push(`- Siyasi/makro risk: ${snap.politicalRisk}`);
    if (snap.notes?.trim()) lines.push(`- Notlar: ${snap.notes.trim()}`);

    lines.push("");
    lines.push(
      "Koç olarak bu makro tabloya bak. BIST için kırmızı/sarı/yeşil alarm seviyesi öner, kısaca 2-3 paragraf. Pozisyon boyutu ve nakit oranı konusunda genel ilke seviyesinde yorum yap. Al/sat deme.",
    );

    onAskCoach(lines.join("\n"));
    onOpenChange(false);
  }

  const riskOptions: Array<{ id: MacroSnapshot["politicalRisk"]; label: string }> = [
    { id: "dusuk", label: "Düşük" },
    { id: "orta", label: "Orta" },
    { id: "yuksek", label: "Yüksek" },
  ];

  const trendOptions: Array<{ id: MacroSnapshot["bist100Trend"]; label: string }> = [
    { id: "yukari", label: "↑ Yukarı" },
    { id: "yatay", label: "→ Yatay" },
    { id: "asagi", label: "↓ Aşağı" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Globe className="w-5 h-5 text-primary" />
              Makro Risk Paneli
            </h2>
            <p className="text-xs text-muted-foreground">
              Güncel makro verileri gir, Koç BIST için risk yorumlaması yapsın.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-usd" className="text-xs">USD/TRY</Label>
              <Input
                id="m-usd"
                type="number"
                step="0.01"
                value={snap.usdTry ?? ""}
                onChange={(e) => update("usdTry", e.target.value)}
                placeholder="42.50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-cpi" className="text-xs">Yıllık TÜFE %</Label>
              <Input
                id="m-cpi"
                type="number"
                step="0.1"
                value={snap.cpiYoyPct ?? ""}
                onChange={(e) => update("cpiYoyPct", e.target.value)}
                placeholder="38.2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-rate" className="text-xs">TCMB Faizi %</Label>
              <Input
                id="m-rate"
                type="number"
                step="0.25"
                value={snap.tcmbRatePct ?? ""}
                onChange={(e) => update("tcmbRatePct", e.target.value)}
                placeholder="42.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">BIST100 son haftalık trend</Label>
            <div className="flex gap-1.5">
              {trendOptions.map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  size="sm"
                  variant={snap.bist100Trend === o.id ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => update("bist100Trend", o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Siyasi/makro risk algısı</Label>
            <div className="flex gap-1.5">
              {riskOptions.map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  size="sm"
                  variant={snap.politicalRisk === o.id ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => update("politicalRisk", o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-notes" className="text-xs">
              Notlar <span className="text-muted-foreground">(son hafta olayları)</span>
            </Label>
            <Textarea
              id="m-notes"
              value={snap.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              placeholder="Örn: TCMB 150bp indirim sinyali, enflasyon düşüş trendi, seçim söylentileri..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" className="flex-1">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Koç yorumlasın
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

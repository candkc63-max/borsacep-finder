import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Ko\u00e7 paneline seed olarak g\u00f6nder */
  onAnalyze: (text: string) => void;
}

/**
 * #5 Scam & Guru Filtresi + #13 VIP Sinyal Engelleyici
 *
 * Kullan\u0131c\u0131 bir URL, telegram grubu linki, "VIP sinyal" metni veya
 * guru hesab\u0131 yap\u0131\u015ft\u0131r\u0131r \u2192 Ko\u00e7 scam_check senaryosuyla yorumlar.
 */
export function ScamCheckDialog({ open, onOpenChange, onAnalyze }: Props) {
  const [content, setContent] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 5) return;
    onAnalyze(
      `A\u015fa\u011f\u0131daki mesaj/link/hesap/teklif scam olabilir mi, de\u011ferlendirir misin?\n\n${trimmed}`,
    );
    setContent("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Scam & Guru Kontrolü
            </h2>
            <p className="text-xs text-muted-foreground">
              \u015e\u00fcpheli mesaj, link, Telegram/WhatsApp grubu, VIP sinyal teklifi veya influencer hesab\u0131n\u0131 yap\u0131\u015ft\u0131r. Ko\u00e7 scam riskini de\u011ferlendirir.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scam-content" className="text-xs">
              Şüpheli içerik
            </Label>
            <Textarea
              id="scam-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={
                '\u00d6rn:\n"Merhaba kardeş, VIP grubumuza katıl, haftada %30 kazandırıyoruz. 500 TL giriş ücreti, link: t.me/..."'
              }
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Not: Yat\u0131r\u0131m tavsiyesi değil. Ko\u00e7 nesnel risk analizi yapar.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              \u0130ptal
            </Button>
            <Button type="submit" className="flex-1">
              Ko\u00e7 incelesin
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

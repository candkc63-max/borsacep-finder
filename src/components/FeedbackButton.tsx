import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_EMAIL = "info@borsa101.com";

/**
 * Beta geri bildirim — küçük "Geri Bildirim" düğmesi.
 * Kullanıcı yazıyor, mailto:// linkiyle açılıyor + localStorage'a yedek.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"bug" | "feature" | "general">("general");

  const types: Array<{ id: typeof type; label: string }> = [
    { id: "bug", label: "Hata" },
    { id: "feature", label: "Özellik İsteği" },
    { id: "general", label: "Genel" },
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (text.length < 10) {
      toast.error("Lütfen en az birkaç cümle yaz");
      return;
    }

    // Yerel yedek (mailto açılamayan kullanıcı için)
    try {
      const all = JSON.parse(localStorage.getItem("borsacep-feedback-v1") || "[]");
      all.push({ type, content: text, at: new Date().toISOString() });
      localStorage.setItem("borsacep-feedback-v1", JSON.stringify(all));
    } catch {
      /* ignore */
    }

    const subject = encodeURIComponent(`[Borsa101 ${typeLabel(type)}] Geri bildirim`);
    const body = encodeURIComponent(
      `Tür: ${typeLabel(type)}\n\nMesaj:\n${text}\n\n---\nGönderim: ${new Date().toLocaleString("tr-TR")}\nTarayıcı: ${navigator.userAgent}`,
    );
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;

    toast.success("Mail uygulamanız açıldı. Göndermeyi unutma 🙏");
    setContent("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card/90 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition"
        title="Geri bildirim gönder"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Geri bildirim</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MessageSquarePlus className="w-5 h-5 text-primary" />
                Geri Bildirim
              </h2>
              <p className="text-xs text-muted-foreground">
                Borsa101 beta sürümünde — hata, eksik veya öneri varsa yaz, bizzat okuyoruz.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tür</Label>
              <div className="flex gap-1.5">
                {types.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    size="sm"
                    variant={type === t.id ? "default" : "outline"}
                    className="flex-1 h-8 text-xs"
                    onClick={() => setType(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-content" className="text-xs">
                Mesajın
              </Label>
              <Textarea
                id="fb-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Ne çalışmıyor / ne istersin / aklında ne var?"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Mail uygulamanız açılır, gönderdiğinde {FEEDBACK_EMAIL}'e ulaşır.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button type="submit" className="flex-1">
                Gönder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function typeLabel(t: "bug" | "feature" | "general"): string {
  return t === "bug" ? "Hata" : t === "feature" ? "Özellik" : "Genel";
}

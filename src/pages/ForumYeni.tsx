import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { createPost } from "@/lib/forum/api";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function ForumYeni() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Yazmak için giriş yap.");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const submit = async () => {
    if (title.trim().length < 3) return toast.error("Başlık en az 3 karakter olmalı.");
    if (body.trim().length < 1) return toast.error("İçerik boş olamaz.");
    setSubmitting(true);
    try {
      const post = await createPost({ title, body, ticker: ticker || null });
      toast.success("Konu açıldı.");
      navigate(`/forum/${post.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yazılamadı";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/forum")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold flex-1">Yeni Konu</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Başlık</Label>
            <Input
              id="title"
              placeholder="Örn: THYAO için kısa vade görüşünüz nedir?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">{title.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticker">Hisse Kodu (opsiyonel)</Label>
            <Input
              id="ticker"
              placeholder="THYAO"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              maxLength={10}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">İçerik</Label>
            <Textarea
              id="body"
              placeholder="Düşünceni paylaş, soru sor, analiz at..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={10}
            />
            <p className="text-[11px] text-muted-foreground">{body.length}/5000</p>
          </div>

          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Uyarı:</strong> Burada yazılanlar yatırım tavsiyesi
            değildir. Manipülatif içerik, küfür veya kişisel saldırı yasaktır.
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => navigate("/forum")} disabled={submitting}>
              İptal
            </Button>
            <Button onClick={submit} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gönder
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

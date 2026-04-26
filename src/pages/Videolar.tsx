import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, PlayCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { VideoCard } from "@/components/videos/VideoCard";
import { VideoCategoryFilter } from "@/components/videos/VideoCategoryFilter";
import { VideoPlayerDialog } from "@/components/videos/VideoPlayerDialog";
import { VIDEOS } from "@/data/videos";
import { CATEGORY_ORDER, type VideoCategory, type VideoEntry } from "@/lib/videos/types";
import { useAuth } from "@/hooks/useAuth";

const Videolar = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [activeCat, setActiveCat] = useState<VideoCategory | "all">("all");
  const [playing, setPlaying] = useState<VideoEntry | null>(null);

  // Kategori bazında sayım — boş olanları görsel olarak silikleştirmek için
  const counts = useMemo(() => {
    const c: Record<VideoCategory | "all", number> = {
      all: VIDEOS.length,
      egitim: 0,
      piyasa_analizi: 0,
      strateji: 0,
      canli: 0,
      soru_cevap: 0,
    };
    for (const v of VIDEOS) c[v.category]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    if (activeCat === "all") return VIDEOS;
    return VIDEOS.filter((v) => v.category === activeCat);
  }, [activeCat]);

  // Yükleniyor — boş ekran
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  // Üye değil — gate ekranı
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto px-4 py-8 max-w-2xl flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Anasayfaya dön
          </Link>

          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Video Kütüphanesi — Üyelere Özel</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                BIST eğitim, piyasa analizi, strateji ve soru-cevap videoları üye girişi gerektirir.
                Ücretsiz üye olabilir veya mevcut hesabınla giriş yapabilirsin.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button onClick={() => navigate("/auth")} className="gap-2">
                <LogIn className="w-4 h-4" />
                Giriş yap / Üye ol
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Ana sayfaya dön
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Giriş yapmış — video listesi
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-6 flex-1 max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Anasayfaya dön
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <PlayCircle className="w-6 h-6 text-primary" />
            Video Kütüphanesi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            BIST eğitim, piyasa analizi, strateji ve canlı yayın kayıtları.
          </p>
        </div>

        <div className="mb-5">
          <VideoCategoryFilter
            active={activeCat}
            counts={counts}
            onChange={setActiveCat}
          />
        </div>

        {VIDEOS.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Bu kategoride henüz video yok.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} onPlay={setPlaying} />
            ))}
          </div>
        )}
      </div>

      <VideoPlayerDialog video={playing} onClose={() => setPlaying(null)} />

      <Footer />
    </div>
  );
};

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <PlayCircle className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Yakında — ilk videolar yolda</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        BIST eğitim ve strateji videoları hazırlanıyor. Üye olduğun için yayına girer girmez bildirim alacaksın.
      </p>
    </div>
  );
}

export default Videolar;

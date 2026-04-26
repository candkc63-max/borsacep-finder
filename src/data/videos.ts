import type { VideoEntry } from "@/lib/videos/types";

/**
 * Üye video kütüphanesi.
 *
 * Yeni video eklemek için:
 * 1. YouTube'a videoyu yükle (Unlisted veya Public)
 * 2. URL'deki v=... parametresinden videoId'yi kopyala
 * 3. Buraya bir nesne ekle, en üste koy (en yeni en üstte gözüksün)
 * 4. Commit + push → Vercel otomatik deploy
 *
 * Liste boş bırakılırsa /videolar sayfası "yakında" mesajı gösterir.
 */
export const VIDEOS: VideoEntry[] = [
  // Örnek bir entry — kendi videon hazır olunca yorumu kaldır ve doldur
  // {
  //   id: "ema-50-200-stratejisi",
  //   youtubeId: "dQw4w9WgXcQ",
  //   title: "EMA 50/200 Stratejisi — Golden Cross Yakalama",
  //   description: "BIST hisselerinde 50 ve 200 günlük üstel hareketli ortalamaların kesişimini nasıl kullanırsın? 8 dakikada özet.",
  //   category: "strateji",
  //   durationSec: 510,
  //   publishedAt: "2026-04-23",
  // },
];

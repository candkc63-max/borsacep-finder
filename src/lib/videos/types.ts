/**
 * Üye videoları — YouTube embed tabanlı.
 *
 * Kullanım: Sen YouTube'a (unlisted/public) video yükle,
 * `src/data/videos.ts`'e bir entry ekle, push et — canlıda görünür.
 */

export type VideoCategory =
  | "egitim"
  | "piyasa_analizi"
  | "strateji"
  | "canli"
  | "soru_cevap";

export interface VideoEntry {
  id: string;             // benzersiz slug (URL'de kullanılır ileride)
  youtubeId: string;      // YouTube video ID — URL'deki v=... parametresi
  title: string;
  description: string;
  category: VideoCategory;
  durationSec: number;    // dakika*60 + saniye (örn 8 dk 30 sn = 510)
  publishedAt: string;    // ISO date — örn "2026-04-23"
  premium?: boolean;      // ileride ücretli plan ayrımı için
}

export const CATEGORY_LABEL: Record<VideoCategory, string> = {
  egitim: "Eğitim",
  piyasa_analizi: "Piyasa Analizi",
  strateji: "Strateji",
  canli: "Canlı Yayın",
  soru_cevap: "Soru & Cevap",
};

export const CATEGORY_ORDER: VideoCategory[] = [
  "egitim",
  "piyasa_analizi",
  "strateji",
  "soru_cevap",
  "canli",
];

export function youtubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}:${String(remainMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatPublishedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

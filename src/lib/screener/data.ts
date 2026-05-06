/**
 * Veri katmanı — Mock'tan canlı Supabase'e geçiş tek noktada.
 *
 * Supabase tablosu (fundamentals) hazır olunca:
 *   USE_MOCK = false yap. Frontend hiç değişmiyor.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/backend";
import { getMockFundamentals, getMockSectors } from "./mockData";
import type { Fundamental, FilterState } from "./types";

const USE_MOCK = true; // Supabase fundamentals tablosu kurulup veri eklendiğinde false yap

export function useFundamentals(): {
  data: Fundamental[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
} {
  const [data, setData] = useState<Fundamental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 200));
        if (!cancelled) {
          setData(getMockFundamentals());
          setLoading(false);
        }
        return;
      }

      try {
        // fundamentals tablosu Supabase generated types'a henüz eklenmedi
        const client = supabase as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => Promise<{ data: unknown; error: { message: string } | null }>;
            };
          };
        };
        const { data: rows, error: err } = await client
          .from("fundamentals")
          .select("*")
          .order("market_cap", { ascending: false });
        if (err) throw err;
        if (!cancelled) {
          setData((rows as Fundamental[]) || []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Veri alınamadı");
          // Fallback: mock göster
          setData(getMockFundamentals());
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, isMock: USE_MOCK };
}

export function useSectors(): string[] {
  if (USE_MOCK) return getMockSectors();
  // Canlı moddayken data'dan türetilir
  return [];
}

/**
 * Filter'ı uygula — saf fonksiyon, tüm sayfada test edilebilir.
 */
export function applyFilters(rows: Fundamental[], filters: FilterState): Fundamental[] {
  return rows.filter((r) => {
    // Sektör
    if (filters.sectors.length > 0) {
      if (!r.sector || !filters.sectors.includes(r.sector)) return false;
    }

    // Search (ticker veya isim)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${r.ticker} ${r.company_name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Metrikler
    for (const [key, range] of Object.entries(filters.metrics)) {
      if (!range) continue;
      const val = r[key as keyof Fundamental] as number | null;
      // NULL → filtreden hariç (boş veriyi dahil etme)
      if (val == null) {
        if (range.min !== undefined || range.max !== undefined) return false;
        continue;
      }
      if (range.min !== undefined && val < range.min) return false;
      if (range.max !== undefined && val > range.max) return false;
    }

    return true;
  });
}

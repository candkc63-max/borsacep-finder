import { useQuery } from "@tanstack/react-query";
import type { Stock } from "@/lib/stockData";
import { setRealFundamentals } from "@/lib/fundamentals";

interface BistResponse {
  stocks: Stock[];
  timestamp: number;
}

async function fetchBistStocks(): Promise<Stock[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke<BistResponse>("bist-stocks");

  if (error) {
    console.error("Edge function error:", error);
    const msg = error.message || "";
    if (msg.includes("FunctionsFetchError") || msg.includes("Failed to fetch")) {
      throw new Error("Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.");
    }
    if (msg.includes("401") || msg.includes("403")) {
      throw new Error("Yetkilendirme hatası. Lütfen tekrar giriş yapın.");
    }
    throw new Error("Hisse verileri alınamadı. Lütfen daha sonra tekrar deneyin.");
  }

  if (!data?.stocks || data.stocks.length === 0) {
    throw new Error("Veri bulunamadı. Piyasa kapalı olabilir.");
  }

  // Cache real fundamentals so filters use real data
  for (const s of data.stocks) {
    if (s.fundamentals) setRealFundamentals(s.symbol, s.fundamentals);
  }

  return data.stocks;
}

export function useBistStocks() {
  const hasBackend = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  return useQuery({
    queryKey: ["bist-stocks"],
    queryFn: fetchBistStocks,
    enabled: hasBackend,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

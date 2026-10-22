import { useEffect, useState } from "react";
import { CandlestickChart } from "@/grafik/CandlestickChart";
import { STOCKS, type Stock } from "@/data/stocks";
import { chartHash, isChartHash } from "@/screener/chartLink";
import { mergeScan, QUOTE_CACHE_TTL, readQuoteCache, writeQuoteCache } from "@/screener/coverage";
import { Screener } from "@/screener/Screener";

export default function App() {
  const [view, setView] = useState<"filter" | "grafik">(
    () => (isChartHash(window.location.hash) ? "grafik" : "filter"),
  );
  const [stocks, setStocks] = useState<Stock[]>(STOCKS);
  const [source, setSource] = useState<"idle" | "loading" | "yahoo" | "error">("idle");
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setView(isChartHash(window.location.hash) ? "grafik" : "filter");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function loadQuotes() {
    setSource("loading");
    const response = await fetch("/api/bist-quotes");
    if (!response.ok) {
      setSource("error");
      throw new Error("quotes");
    }
    const body = await response.json() as { stocks?: Stock[]; asOf?: string };
    if (!body.stocks?.length) {
      setSource("error");
      throw new Error("quotes");
    }
    const merged = mergeScan(STOCKS, body.stocks, readQuoteCache(sessionStorage), Date.now(), QUOTE_CACHE_TTL);
    writeQuoteCache(merged.cache, sessionStorage);
    setStocks(merged.stocks);
    setSource("yahoo");
    setAsOf(body.asOf ?? null);
  }

  function openChart(ticker: string, blank: boolean) {
    const hash = chartHash(ticker);
    if (blank) {
      window.open(`${window.location.pathname}${window.location.search}${hash}`, "_blank", "noopener");
      return;
    }
    window.location.hash = hash;
  }

  if (view === "grafik") {
    return (
      <div className="flex h-screen flex-col bg-black text-white">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-400">
          <span>Grafik</span>
          <a href="#filtre" className="text-neutral-300">Hisse filtreleme</a>
        </div>
        <div className="min-h-0 flex-1">
          <CandlestickChart />
        </div>
      </div>
    );
  }

  const sourceLabel = source === "yahoo"
    ? `Yahoo Finance${asOf ? ` · ${new Date(asOf).toLocaleString("tr-TR")}` : ""}`
    : source === "loading"
      ? "Canlı veri yükleniyor"
      : source === "error"
        ? "Canlı veri alınamadı"
        : "Tarama başlatılmadı";

  return <Screener stocks={stocks} sourceLabel={sourceLabel} onOpen={openChart} onScan={loadQuotes} />;
}

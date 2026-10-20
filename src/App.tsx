import { useEffect, useState } from "react";
import { CandlestickChart } from "@/grafik/CandlestickChart";
import { STOCKS, type Stock } from "@/data/stocks";
import { chartHash, isChartHash } from "@/screener/chartLink";
import { Screener } from "@/screener/Screener";

export default function App() {
  const [view, setView] = useState<"filter" | "grafik">(
    () => (isChartHash(window.location.hash) ? "grafik" : "filter"),
  );
  const [stocks, setStocks] = useState<Stock[]>(STOCKS);
  const [source, setSource] = useState<"loading" | "yahoo" | "sample">("loading");
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setView(isChartHash(window.location.hash) ? "grafik" : "filter");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancel = false;
    fetch("/api/bist-quotes")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body: { stocks?: Stock[]; asOf?: string }) => {
        if (cancel || !body.stocks?.length) return;
        setStocks(body.stocks);
        setSource("yahoo");
        setAsOf(body.asOf ?? null);
      })
      .catch(() => {
        if (!cancel) setSource("sample");
      });
    return () => {
      cancel = true;
    };
  }, []);

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
      : "Canlı veri alınamadı, örnek liste duruyor";

  return <Screener stocks={stocks} sourceLabel={sourceLabel} onOpen={openChart} />;
}

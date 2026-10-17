import { useEffect, useMemo, useState } from "react";
import { CandlestickChart } from "@/grafik/CandlestickChart";
import {
  EMPTY_FILTER,
  SECTORS,
  STOCKS,
  filterStocks,
  type Stock,
  formatCap,
  sortStocks,
  type SortKey,
  type StockFilter,
} from "@/data/stocks";

const numberFields: { key: keyof StockFilter; label: string; placeholder: string }[] = [
  { key: "peMax", label: "F/K en fazla", placeholder: "10" },
  { key: "pbMax", label: "PD/DD en fazla", placeholder: "1.5" },
  { key: "roeMin", label: "ROE en az %", placeholder: "15" },
  { key: "dividendMin", label: "Temettü en az %", placeholder: "3" },
];

const columns: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "ticker", label: "Hisse", align: "left" },
  { key: "price", label: "Fiyat", align: "right" },
  { key: "marketCap", label: "Piyasa Değeri", align: "right" },
  { key: "pe", label: "F/K", align: "right" },
  { key: "pb", label: "PD/DD", align: "right" },
  { key: "roe", label: "ROE", align: "right" },
  { key: "dividendYield", label: "Temettü", align: "right" },
  { key: "change1y", label: "1Y", align: "right" },
];

export default function App() {
  const [view, setView] = useState<"filter" | "grafik">(
    () => (window.location.hash === "#grafik" ? "grafik" : "filter"),
  );
  const [filter, setFilter] = useState<StockFilter>(EMPTY_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDesc, setSortDesc] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>(STOCKS);
  const [source, setSource] = useState<"loading" | "yahoo" | "sample">("loading");
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setView(window.location.hash === "#grafik" ? "grafik" : "filter");
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

  const rows = useMemo(() => {
    return sortStocks(filterStocks(stocks, filter), sortKey, sortDesc);
  }, [stocks, filter, sortKey, sortDesc]);

  const setField = (key: keyof StockFilter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setSortDesc((prev) => !prev);
    else {
      setSortKey(key);
      setSortDesc(key !== "ticker");
    }
  };

  if (view === "grafik") {
    return (
      <div className="flex h-screen flex-col bg-black text-white">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-400">
          <span>Dummy OHLCV · Apache ECharts</span>
          <a href="#filtre" className="text-neutral-300">Hisse filtreleme</a>
        </div>
        <div className="min-h-0 flex-1">
          <CandlestickChart />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">BORSA101</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Hisse filtreleme</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} / {stocks.length} hisse.{" "}
            {source === "yahoo"
              ? `Yahoo Finance${asOf ? ` · ${new Date(asOf).toLocaleString("tr-TR")}` : ""}`
              : source === "loading"
                ? "Canlı veri yükleniyor"
                : "Canlı veri alınamadı, örnek liste duruyor"}
          </p>
          </div>
          <a href="#grafik" className="pt-1 text-sm text-muted-foreground">Grafik</a>
        </header>

        <section className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Hisse ara</span>
              <input
                value={filter.search}
                onChange={(e) => setField("search", e.target.value)}
                placeholder="THYAO, Garanti"
                className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Sektör</span>
              <select
                value={filter.sector}
                onChange={(e) => setField("sector", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background/70 px-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Tümü</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </label>
            {numberFields.map((field) => (
              <label key={field.key}>
                <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
                <input
                  inputMode="decimal"
                  value={filter[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setFilter(EMPTY_FILTER)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Filtreleri temizle
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={column.align === "right" ? "p-3 text-right" : "p-3 text-left"}>
                      <button type="button" onClick={() => sortBy(column.key)} className="font-medium hover:text-foreground">
                        {column.label}
                        {sortKey === column.key ? (sortDesc ? " ↓" : " ↑") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((stock) => (
                  <tr key={stock.ticker} className="border-b border-border/50">
                    <td className="p-3">
                      <div className="font-mono font-semibold">{stock.ticker}</div>
                      <div className="text-xs text-muted-foreground">{stock.name} · {stock.sector}</div>
                    </td>
                    <td className="p-3 text-right font-mono">₺{stock.price.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{formatCap(stock.marketCap)}</td>
                    <td className="p-3 text-right font-mono">{stock.pe == null ? "—" : stock.pe.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono">{stock.pb == null ? "—" : stock.pb.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{stock.roe == null ? "—" : `${stock.roe.toFixed(1)}%`}</td>
                    <td className="p-3 text-right font-mono">{stock.dividendYield == null ? "—" : `${stock.dividendYield.toFixed(2)}%`}</td>
                    <td className={`p-3 text-right font-mono ${stock.change1y != null && stock.change1y < 0 ? "text-bearish" : "text-bullish"}`}>
                      {stock.change1y == null ? "—" : `${stock.change1y > 0 ? "+" : ""}${stock.change1y.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Bu filtreye uyan hisse yok.</p>
          )}
        </section>
      </div>
    </div>
  );
}

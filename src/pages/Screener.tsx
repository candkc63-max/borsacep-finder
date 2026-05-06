import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Filter as FilterIcon,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Footer } from "@/components/Footer";
import { applyFilters, useFundamentals, useSectors } from "@/lib/screener/data";
import {
  BUILTIN_PRESETS,
  EMPTY_FILTERS,
  METRICS,
  type FilterState,
  type Fundamental,
  type MetricMeta,
  type NumericMetricKey,
} from "@/lib/screener/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Screener = () => {
  const { data: rows, loading, isMock } = useFundamentals();
  const sectors = useSectors();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "market_cap", desc: true },
  ]);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  const columns = useMemo<ColumnDef<Fundamental>[]>(
    () => buildColumns(),
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const updateMetric = (key: NumericMetricKey, range: { min?: number; max?: number }) => {
    setFilters((prev) => {
      const next = { ...prev, metrics: { ...prev.metrics } };
      if (range.min === undefined && range.max === undefined) {
        delete next.metrics[key];
      } else {
        next.metrics[key] = range;
      }
      return next;
    });
  };

  const toggleSector = (sec: string) => {
    setFilters((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(sec)
        ? prev.sectors.filter((s) => s !== sec)
        : [...prev.sectors, sec],
    }));
  };

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const applyPreset = (id: string) => {
    const p = BUILTIN_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setFilters({ ...p.filters, search: filters.search });
    toast.success(`Preset uygulandı: ${p.name}`, { description: p.description });
  };

  const activeFilterCount =
    filters.sectors.length + Object.keys(filters.metrics).length;

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Aktarılacak satır yok");
      return;
    }
    const header = ["ticker", "company_name", "sector", ...METRICS.map((m) => m.key)];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const row = header.map((h) => {
        const v = (r as any)[h];
        if (v == null) return "";
        if (typeof v === "string") return `"${v.replace(/"/g, '""')}"`;
        return v;
      });
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `borsa101-screener-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} satır CSV olarak indirildi`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-3 py-3 flex-1 max-w-[1400px]">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anasayfa
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Temel Analiz Tarayıcı
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden h-8 text-xs">
                  <FilterIcon className="h-3.5 w-3.5 mr-1" />
                  Filtre {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[340px] p-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <FilterPanel
                      filters={filters}
                      sectors={sectors}
                      onUpdateMetric={updateMetric}
                      onToggleSector={toggleSector}
                      onClearAll={clearAll}
                      onSearch={(q) => setFilters((p) => ({ ...p, search: q }))}
                    />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Mock uyarısı */}
        {isMock && (
          <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2.5 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-yellow-700 dark:text-yellow-400">Demo veri</strong> —
              30 BIST hissesi için örnek temel veriler gösteriliyor. Canlı veri için
              Supabase fundamentals tablosu kurulup ilk veri çekişi yapıldığında
              otomatik geçiş olacak.
            </div>
          </div>
        )}

        {/* Preset chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">
            Hazır:
          </span>
          {BUILTIN_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
              title={p.description}
            >
              <Sparkles className="inline h-3 w-3 mr-1" />
              {p.name}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full bg-bearish/10 border border-bearish/40 text-bearish px-2.5 py-1 text-[11px] hover:bg-bearish/20"
            >
              <X className="inline h-3 w-3 mr-1" />
              Filtreleri temizle ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Layout: filter panel + results */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
          {/* Filter panel — desktop */}
          <aside className="hidden lg:block">
            <div className="rounded-lg border border-border bg-card p-3 sticky top-3">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <FilterPanel
                  filters={filters}
                  sectors={sectors}
                  onUpdateMetric={updateMetric}
                  onToggleSector={toggleSector}
                  onClearAll={clearAll}
                  onSearch={(q) => setFilters((p) => ({ ...p, search: q }))}
                />
              </ScrollArea>
            </div>
          </aside>

          {/* Results */}
          <main>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{filtered.length}</strong> /{" "}
                  {rows.length} hisse
                </span>
                <span className="text-muted-foreground">
                  Sayfa {table.getState().pagination.pageIndex + 1} /{" "}
                  {table.getPageCount() || 1}
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Yükleniyor...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Bu filtrelere uygun hisse bulunamadı
                  </p>
                  <Button size="sm" variant="outline" onClick={clearAll}>
                    Filtreleri temizle
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-w-full">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border sticky top-0">
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((header) => {
                            const canSort = header.column.getCanSort();
                            const sorted = header.column.getIsSorted();
                            return (
                              <th
                                key={header.id}
                                className={cn(
                                  "px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap",
                                  canSort && "cursor-pointer select-none hover:text-foreground",
                                )}
                                onClick={
                                  canSort
                                    ? header.column.getToggleSortingHandler()
                                    : undefined
                                }
                              >
                                <span className="inline-flex items-center gap-1">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  {sorted === "asc" && "↑"}
                                  {sorted === "desc" && "↓"}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-2 py-2 whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}

              {/* Pagination */}
              <div className="px-3 py-2 border-t border-border flex items-center justify-between text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 text-xs"
                >
                  ← Önceki
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 text-xs"
                >
                  Sonraki →
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// ====================== Filter Panel ======================
function FilterPanel({
  filters,
  sectors,
  onUpdateMetric,
  onToggleSector,
  onClearAll,
  onSearch,
}: {
  filters: FilterState;
  sectors: string[];
  onUpdateMetric: (key: NumericMetricKey, range: { min?: number; max?: number }) => void;
  onToggleSector: (sec: string) => void;
  onClearAll: () => void;
  onSearch: (q: string) => void;
}) {
  const groups = useMemo(() => {
    const g = new Map<string, MetricMeta[]>();
    for (const m of METRICS) {
      const arr = g.get(m.group) || [];
      arr.push(m);
      g.set(m.group, arr);
    }
    return Array.from(g.entries());
  }, []);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-1.5">
        <Label className="text-xs">Hisse Ara</Label>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ticker veya isim..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Sectors */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center justify-between">
          <span>Sektör ({filters.sectors.length}/{sectors.length})</span>
          {filters.sectors.length > 0 && (
            <button
              type="button"
              onClick={() => filters.sectors.forEach((s) => onToggleSector(s))}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              temizle
            </button>
          )}
        </Label>
        <div className="space-y-1 max-h-44 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
          {sectors.map((sec) => (
            <label
              key={sec}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5"
            >
              <Checkbox
                checked={filters.sectors.includes(sec)}
                onCheckedChange={() => onToggleSector(sec)}
              />
              <span>{sec}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Metric groups */}
      {groups.map(([group, metrics]) => (
        <div key={group} className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {group}
          </h3>
          <div className="space-y-3">
            {metrics.map((m) => (
              <RangeFilter
                key={m.key}
                metric={m}
                range={filters.metrics[m.key]}
                onChange={(r) => onUpdateMetric(m.key, r)}
              />
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearAll}
        className="w-full h-7 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Tüm filtreleri temizle
      </Button>
    </div>
  );
}

function RangeFilter({
  metric,
  range,
  onChange,
}: {
  metric: MetricMeta;
  range?: { min?: number; max?: number };
  onChange: (r: { min?: number; max?: number }) => void;
}) {
  const min = range?.min ?? metric.rangeMin;
  const max = range?.max ?? metric.rangeMax;
  const active = range !== undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn(active && "font-semibold text-primary")}>{metric.label}</span>
        <span className="text-muted-foreground">
          {range?.min !== undefined && metric.format(range.min)}
          {range?.min !== undefined && range?.max !== undefined && " — "}
          {range?.max !== undefined && metric.format(range.max)}
          {!active && "tümü"}
        </span>
      </div>
      <Slider
        value={[min, max]}
        min={metric.rangeMin}
        max={metric.rangeMax}
        step={metric.step}
        onValueChange={(vals) => {
          const [a, b] = vals;
          // Default'a eşitse filter kaldır
          if (a === metric.rangeMin && b === metric.rangeMax) {
            onChange({});
          } else {
            onChange({ min: a, max: b });
          }
        }}
      />
    </div>
  );
}

// ====================== Tablo Sütunları ======================
function buildColumns(): ColumnDef<Fundamental>[] {
  return [
    {
      accessorKey: "ticker",
      header: "Ticker",
      cell: ({ row }) => (
        <span className="font-mono font-bold">{row.original.ticker}</span>
      ),
    },
    {
      accessorKey: "company_name",
      header: "Şirket",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.company_name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "sector",
      header: "Sektör",
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground">
          {row.original.sector ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "current_price",
      header: "Fiyat",
      cell: ({ row }) => {
        const p = row.original.current_price;
        const ch = row.original.price_change_1y;
        return (
          <div className="text-right">
            <div className="font-mono">{p == null ? "—" : `₺${p.toFixed(2)}`}</div>
            {ch != null && (
              <div
                className={cn(
                  "text-[10px] font-mono",
                  ch >= 0 ? "text-bullish" : "text-bearish",
                )}
              >
                {ch >= 0 ? "+" : ""}
                {ch.toFixed(1)}%
              </div>
            )}
          </div>
        );
      },
    },
    metricCol("market_cap"),
    metricCol("pe_ratio"),
    metricCol("pb_ratio"),
    metricCol("ev_ebitda"),
    metricCol("roe"),
    metricCol("net_margin"),
    metricCol("revenue_growth"),
    metricCol("earnings_growth"),
    metricCol("debt_equity"),
    metricCol("dividend_yield"),
  ];
}

function metricCol(key: NumericMetricKey): ColumnDef<Fundamental> {
  const meta = METRICS.find((m) => m.key === key)!;
  return {
    accessorKey: key,
    header: meta.label,
    cell: ({ row }) => {
      const v = row.original[key];
      const formatted = meta.format(v);
      return <span className="font-mono">{formatted}</span>;
    },
    sortingFn: (a, b) => {
      const va = (a.original[key] as number | null) ?? -Infinity;
      const vb = (b.original[key] as number | null) ?? -Infinity;
      return va - vb;
    },
  };
}

export default Screener;

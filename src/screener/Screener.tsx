import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Stock } from "@/data/stocks";
import { formatCap } from "@/data/stocks";
import {
  COLUMNS,
  FIELDS,
  PRESETS,
  TABS,
  applyScreen,
  categoryOptions,
  clampWidth,
  fieldById,
  operatorLabel,
  pageOf,
  ruleNeedsBars,
  toScreenerRow,
  visibleColumns,
  type ColumnDef,
  type Operator,
  type Rule,
  type ScreenerRow,
  type TabId,
  type Universe,
} from "@/screener/model";
import { closedBars, snapshotFromBars, type ScreenInterval, type TechnicalSnapshot } from "@/screener/snapshot";
import {
  FAV_KEY,
  WATCH_KEY,
  loadScreens,
  loadTickers,
  readTechCache,
  toggleTicker,
  writeScreens,
  writeTechCache,
  writeTickers,
  type SavedScreen,
} from "@/screener/store";

type Draft = {
  name: string;
  rules: Rule[];
  columns: string[] | null;
  sortKey: string;
  sortDesc: boolean;
  tab: TabId;
  universe: Universe;
  interval: ScreenInterval;
  search: string;
};

const EMPTY: Draft = {
  name: "",
  rules: [],
  columns: null,
  sortKey: "marketCap",
  sortDesc: true,
  tab: "overview",
  universe: "all",
  interval: "1d",
  search: "",
};

const fieldStyle: CSSProperties = {
  height: 30,
  borderRadius: 6,
  border: "1px solid #2c2c2c",
  background: "#101010",
  color: "#f2f2f2",
  padding: "0 8px",
  font: "12px/1 ui-sans-serif, system-ui, sans-serif",
};

const buttonStyle: CSSProperties = {
  height: 30,
  borderRadius: 6,
  border: "1px solid #3a3a3a",
  background: "#161616",
  color: "#f2f2f2",
  padding: "0 10px",
  cursor: "pointer",
};

function textOf(row: ScreenerRow, id: string) {
  if (id === "ticker") return row.ticker;
  if (id === "name") return row.name;
  if (id === "sector") return row.sector;
  if (id === "index") return row.indexes.join(", ");
  if (id === "market") return row.market ?? "";
  return "";
}

function signed(value: number) {
  const text = value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value > 0 ? "+" : ""}${text}%`;
}

function plain(value: number, digits = 2) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function tone(value: number | null) {
  if (value == null || value === 0) return "#d0d0d0";
  return value > 0 ? "#16c47a" : "#e10600";
}

function defaultWidth(id: string) {
  if (id === "name" || id === "sector") return 168;
  if (id === "ticker") return 96;
  if (id === "changeDay" || id === "earningsGrowth" || id === "revenueGrowth" || id === "dividendYield") return 132;
  return 112;
}

function Cell({ row, column }: { row: ScreenerRow; column: ColumnDef }) {
  if (column.kind === "text") {
    const text = textOf(row, column.id);
    return <span title={text || "veri yok"}>{text || "—"}</span>;
  }
  const resolved = resolve(row, column.id);
  if (resolved == null || (column.id === "price" && resolved === 0)) return <span title="veri yok">—</span>;
  if (column.kind === "pct") return <span style={{ color: tone(resolved) }}>{signed(resolved)}</span>;
  if (column.kind === "percent") return <span>{`${plain(resolved)}%`}</span>;
  if (column.kind === "price") {
    const up = column.id === "supertrend" ? row.technical?.supertrendUp : null;
    return <span style={{ color: up == null ? "#f2f2f2" : up ? "#16c47a" : "#e10600" }}>{plain(resolved)}</span>;
  }
  if (column.kind === "volume" || column.kind === "cap") return <span>{formatCap(resolved)}</span>;
  if (column.kind === "rel") return <span>{`${plain(resolved)}x`}</span>;
  return <span>{plain(resolved)}</span>;
}

function resolve(row: ScreenerRow, id: string): number | null {
  if (id === "price") return row.price;
  if (id === "changeDay") return row.changeDay;
  if (id === "volume") return row.volume;
  if (id === "averageVolume") return row.averageVolume;
  if (id === "relativeVolume") return row.relativeVolume;
  if (id === "marketCap") return row.marketCap;
  if (id === "pe") return row.pe;
  if (id === "pb") return row.pb;
  if (id === "eps") return row.eps;
  if (id === "roe") return row.roe;
  if (id === "dividendYield") return row.dividendYield;
  if (id === "change1y") return row.change1y;
  if (id === "earningsGrowth") return row.earningsGrowth;
  if (id === "revenueGrowth") return row.revenueGrowth;
  if (id === "week52Distance") return row.week52Distance;
  const tech = row.technical?.[id as keyof TechnicalSnapshot];
  return typeof tech === "number" && Number.isFinite(tech) ? tech : null;
}

export function Screener({
  stocks,
  sourceLabel,
  onOpen,
  loadBars = true,
  pageSize = 25,
}: {
  stocks: Stock[];
  sourceLabel: string;
  onOpen: (ticker: string, blank: boolean) => void;
  loadBars?: boolean;
  pageSize?: number;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [screens, setScreens] = useState<SavedScreen[]>(() => loadScreens());
  const [watch, setWatch] = useState<string[]>(() => loadTickers(WATCH_KEY));
  const [favs, setFavs] = useState<string[]>(() => loadTickers(FAV_KEY));
  const [tech, setTech] = useState<Record<string, TechnicalSnapshot | null>>({});
  const [techNote, setTechNote] = useState("");
  const [page, setPage] = useState(1);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [more, setMore] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const ruleSeq = useRef(1);

  const tickerKey = stocks.map((stock) => stock.ticker).join(",");
  useEffect(() => {
    if (!loadBars) return;
    let cancel = false;
    const tickers = tickerKey ? tickerKey.split(",") : [];
    const interval = draft.interval;
    const cached = readTechCache(interval);
    setTech(cached);
    const queue = [...tickers];
    let done = 0;
    const fetched: Record<string, TechnicalSnapshot | null> = {};
    setTechNote(tickers.length ? "Teknikler yükleniyor" : "");
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (!cancel) {
        const ticker = queue.shift();
        if (!ticker) return;
        let snapshot: TechnicalSnapshot | null = null;
        try {
          const response = await fetch(`/api/chart-bars?id=${encodeURIComponent(`stock-${ticker}`)}&interval=${encodeURIComponent(interval)}`);
          const body = await response.json() as { bars?: { time?: string; high: number; low: number; close: number; volume: number | null }[] };
          const bars = Array.isArray(body.bars) ? closedBars(body.bars, interval) : [];
          snapshot = snapshotFromBars(bars);
        } catch {
          snapshot = null;
        }
        fetched[ticker] = snapshot;
        done += 1;
        if (!cancel && (snapshot || !cached[ticker])) {
          setTech((prev) => ({ ...prev, [ticker]: snapshot ?? prev[ticker] ?? null }));
          setTechNote(`Teknikler ${done}/${tickers.length}`);
        }
      }
    });
    void Promise.all(workers).then(() => {
      if (cancel) return;
      const merged = { ...cached };
      for (const [ticker, snapshot] of Object.entries(fetched)) {
        if (snapshot) merged[ticker] = snapshot;
      }
      writeTechCache(interval, merged);
      setTechNote(Object.values(merged).some(Boolean) ? "Göstergeler kapanmış mumdan hesaplandı" : "Mum serisi alınamadı. Teknik filtreler eşleşmez.");
    });
    return () => {
      cancel = true;
    };
  }, [loadBars, draft.interval, tickerKey]);

  useEffect(() => {
    setPage(1);
  }, [draft.rules, draft.search, draft.universe, draft.sortKey, draft.sortDesc, draft.tab, draft.interval, tickerKey]);

  const rows = useMemo(() => stocks.map((stock) => toScreenerRow(stock, tech[stock.ticker] ?? null)), [stocks, tech]);
  const filtered = useMemo(() => applyScreen(rows, {
    rules: draft.rules,
    search: draft.search,
    universe: draft.universe,
    watchlist: watch,
    sortKey: draft.sortKey,
    sortDesc: draft.sortDesc,
  }), [rows, draft, watch]);
  const paged = pageOf(filtered, page, pageSize);
  const columns = visibleColumns(draft.tab, draft.columns);
  const needsBars = draft.rules.some(ruleNeedsBars);
  const addFields = more ? FIELDS : FIELDS.filter((item) => item.primary);

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function updateRule(id: string, partial: Partial<Rule>) {
    patch({
      rules: draft.rules.map((rule) => {
        if (rule.id !== id) return rule;
        const next = { ...rule, ...partial };
        const field = fieldById(next.field);
        if (field && !field.ops.includes(next.op)) next.op = field.ops[0];
        return next;
      }),
    });
  }

  function addRule() {
    const field = addFields[0] ?? FIELDS[0];
    ruleSeq.current += 1;
    patch({ rules: [...draft.rules, { id: `n-${ruleSeq.current}`, field: field.id, op: field.ops[0], value: "", valueTo: "" }] });
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setSavedId(null);
    patch({
      name: preset.name,
      rules: preset.rules.map((rule, index) => ({ ...rule, id: `${preset.id}-${index}` })),
      tab: preset.tab,
      sortKey: preset.sortKey,
      sortDesc: preset.sortDesc,
      columns: null,
    });
  }

  function persist(next: SavedScreen[]) {
    setScreens(next);
    writeScreens(next);
  }

  function save() {
    const name = draft.name.trim();
    if (!name) return;
    const record: SavedScreen = {
      id: savedId ?? `s-${Date.now().toString(36)}`,
      name,
      rules: draft.rules,
      columns: draft.columns,
      sortKey: draft.sortKey,
      sortDesc: draft.sortDesc,
      tab: draft.tab,
      universe: draft.universe,
      interval: draft.interval,
    };
    const next = screens.some((item) => item.id === record.id)
      ? screens.map((item) => (item.id === record.id ? record : item))
      : [...screens, record];
    persist(next);
    setSavedId(record.id);
  }

  function copyScreen() {
    const record: SavedScreen = {
      id: `s-${Date.now().toString(36)}`,
      name: `${draft.name.trim() || "Filtre"} kopya`,
      rules: draft.rules,
      columns: draft.columns,
      sortKey: draft.sortKey,
      sortDesc: draft.sortDesc,
      tab: draft.tab,
      universe: draft.universe,
      interval: draft.interval,
    };
    persist([...screens, record]);
    setSavedId(record.id);
    patch({ name: record.name });
  }

  function removeScreen() {
    if (!savedId) return;
    persist(screens.filter((item) => item.id !== savedId));
    setSavedId(null);
  }

  function openSaved(id: string) {
    const found = screens.find((item) => item.id === id);
    if (!found) return;
    setSavedId(found.id);
    patch({
      name: found.name,
      rules: found.rules,
      columns: found.columns,
      sortKey: found.sortKey,
      sortDesc: found.sortDesc,
      tab: found.tab,
      universe: found.universe,
      interval: found.interval,
    });
  }

  function toggleColumn(id: string) {
    if (id === "ticker") return;
    const current = draft.columns ?? columns.map((column) => column.id);
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    patch({ columns: next.length ? next : ["ticker"] });
  }

  function resize(id: string, event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const start = widths[id] ?? defaultWidth(id);
    const move = (ev: PointerEvent) => setWidths((prev) => ({ ...prev, [id]: clampWidth(start + ev.clientX - startX) }));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function mark(key: string, list: string[], ticker: string, setList: (next: string[]) => void) {
    const next = toggleTicker(list, ticker);
    setList(next);
    writeTickers(key, next);
  }

  return (
    <div data-testid="screener" style={{ minHeight: "100vh", background: "#000", color: "#f2f2f2", font: "13px/1.4 ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #2c2c2c" }}>
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#9a9a9a" }}>BORSA101</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 650 }}>Hisse Filtreleme</h1>
          <div style={{ color: "#9a9a9a", fontSize: 12 }}>{paged.total} / {rows.length} hisse · {sourceLabel}{techNote ? ` · ${techNote}` : ""}</div>
        </div>
        <select data-testid="screen-saved" aria-label="Kaydedilmiş filtre" value={savedId ?? ""} onChange={(event) => openSaved(event.target.value)} style={fieldStyle}>
          <option value="">Kaydedilmiş filtre</option>
          {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
        </select>
        <input data-testid="screen-name" aria-label="Filtre adı" value={draft.name} placeholder="Filtre adı" onChange={(event) => patch({ name: event.target.value })} style={{ ...fieldStyle, width: 180 }} />
        <button type="button" data-testid="screen-new" onClick={() => { setSavedId(null); patch({ name: "", rules: [], columns: null, tab: "overview", sortKey: "marketCap", sortDesc: true }); }} style={buttonStyle}>Yeni filtre</button>
        <button type="button" data-testid="screen-save" onClick={save} disabled={!draft.name.trim()} style={{ ...buttonStyle, opacity: draft.name.trim() ? 1 : 0.45 }}>Kaydet</button>
        <button type="button" data-testid="screen-copy" onClick={copyScreen} style={buttonStyle}>Kopyala</button>
        <button type="button" data-testid="screen-delete" onClick={removeScreen} disabled={!savedId} style={{ ...buttonStyle, opacity: savedId ? 1 : 0.45 }}>Sil</button>
        <a href="#grafik" style={{ color: "#d0d0d0" }}>Grafik</a>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid #2c2c2c" }}>
        <label>Piyasa
          <select aria-label="Piyasa" value="TR" style={{ ...fieldStyle, marginLeft: 6 }} onChange={() => undefined}>
            <option value="TR">TR</option>
          </select>
        </label>
        <label>Evren
          <select data-testid="screen-universe" aria-label="Evren" value={draft.universe} onChange={(event) => patch({ universe: event.target.value as Universe })} style={{ ...fieldStyle, marginLeft: 6 }}>
            <option value="all">BIST Tümü</option>
            <option value="bist100">BIST 100</option>
            <option value="bist50">BIST 50</option>
            <option value="watch">İzleme Listesi</option>
          </select>
        </label>
        <label>Zaman
          <select data-testid="screen-interval" aria-label="Zaman dilimi" value={draft.interval} onChange={(event) => patch({ interval: event.target.value as ScreenInterval })} style={{ ...fieldStyle, marginLeft: 6 }}>
            <option value="1d">Günlük</option>
            <option value="1wk">Haftalık</option>
            <option value="4h">4s</option>
            <option value="1h">1s</option>
          </select>
        </label>
        <label>Sıra
          <select data-testid="screen-sort" aria-label="Sıralama" value={draft.sortKey} onChange={(event) => patch({ sortKey: event.target.value, sortDesc: event.target.value !== "ticker" && event.target.value !== "name" })} style={{ ...fieldStyle, marginLeft: 6 }}>
            {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
        </label>
        <select data-testid="screen-preset" aria-label="Hazır filtre" value="" onChange={(event) => applyPreset(event.target.value)} style={fieldStyle}>
          <option value="">Hazır filtre</option>
          {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
        </select>
        <button type="button" data-testid="screen-add-filter" onClick={addRule} style={buttonStyle}>Filtre ekle</button>
        <button type="button" data-testid="screen-clear" onClick={() => { setSavedId(null); patch({ rules: [], name: "", columns: null }); }} style={buttonStyle}>Filtreleri temizle</button>
        <button type="button" data-testid="screen-more" onClick={() => setMore((value) => !value)} style={{ ...buttonStyle, color: more ? "#f5c542" : "#f2f2f2" }}>{more ? "Az filtre" : "Daha fazla filtre"}</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", alignItems: "center" }}>
        {draft.rules.map((rule) => {
          const field = fieldById(rule.field);
          const options = field ? categoryOptions(field.id, rows) : [];
          return (
            <div key={rule.id} data-testid="filter-chip" style={{ display: "flex", gap: 4, alignItems: "center", border: "1px solid #2c2c2c", background: "#141414", borderRadius: 999, padding: "2px 6px" }}>
              <select aria-label="Alan" value={rule.field} onChange={(event) => updateRule(rule.id, { field: event.target.value })} style={fieldStyle}>
                {FIELDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select aria-label="Operatör" value={rule.op} onChange={(event) => updateRule(rule.id, { op: event.target.value as Operator })} style={fieldStyle}>
                {(field?.ops ?? []).map((op) => <option key={op} value={op}>{operatorLabel(op)}</option>)}
              </select>
              {field?.kind === "category" ? (
                <select aria-label={`${field.label} değeri`} value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })} style={fieldStyle}>
                  <option value="">{options.length ? "Seç" : "veri yok"}</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : field && field.kind !== "flag" && field.kind !== "cross" ? (
                <>
                  <input aria-label={`${field.label} değeri`} value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })} style={{ ...fieldStyle, width: 72 }} />
                  {rule.op === "between" && <input aria-label={`${field.label} üst değer`} value={rule.valueTo} onChange={(event) => updateRule(rule.id, { valueTo: event.target.value })} style={{ ...fieldStyle, width: 72 }} />}
                </>
              ) : null}
              <button type="button" data-testid={`filter-remove-${rule.id}`} aria-label="Filtreyi sil" onClick={() => patch({ rules: draft.rules.filter((item) => item.id !== rule.id) })} style={{ ...buttonStyle, border: 0, background: "transparent", color: "#9a9a9a" }}>×</button>
            </div>
          );
        })}
        {!draft.rules.length && <span style={{ color: "#9a9a9a" }}>Filtre yok. Hazır bir set seçebilir veya filtre ekleyebilirsin.</span>}
      </div>
      <p style={{ margin: "0 12px 8px", color: "#8d8d8d", fontSize: 12 }}>
        Kayıtlar yalnız bu tarayıcıda durur. Eksik alan — kalır, uydurma değer yazılmaz. Pazar türü bu listede yok. BIST 100 ve BIST 50 yerel etikettir, canlı endeks bileşimi değildir.
        {needsBars ? " Teknik koşullar kapanmış mum ister." : ""}
      </p>

      <div role="tablist" style={{ display: "flex", gap: 2, padding: "0 12px", overflowX: "auto", borderBottom: "1px solid #2c2c2c" }}>
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={draft.tab === tab.id} data-testid={`screen-tab-${tab.id}`} onClick={() => patch({ tab: tab.id, columns: null })} style={{ height: 32, border: 0, borderBottom: draft.tab === tab.id ? "2px solid #f5c542" : "2px solid transparent", background: "transparent", color: draft.tab === tab.id ? "#f2f2f2" : "#9a9a9a", cursor: "pointer", whiteSpace: "nowrap" }}>{tab.label}</button>
        ))}
        <button type="button" data-testid="screen-columns" onClick={() => setColumnsOpen((value) => !value)} style={{ ...buttonStyle, marginLeft: "auto", marginBottom: 4 }}>Kolonlar</button>
      </div>
      {columnsOpen && (
        <div data-testid="screen-column-menu" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 12px", borderBottom: "1px solid #2c2c2c" }}>
          {COLUMNS.map((column) => (
            <label key={column.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" aria-label={column.label} checked={columns.some((item) => item.id === column.id)} disabled={column.id === "ticker"} onChange={() => toggleColumn(column.id)} />
              {column.label}
            </label>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, padding: "8px 12px", alignItems: "center" }}>
        <input data-testid="screen-search" aria-label="Hisse ara" value={draft.search} placeholder="Sembol veya şirket" onChange={(event) => patch({ search: event.target.value })} style={{ ...fieldStyle, width: 220 }} />
        {paged.pages > 1 && (
          <>
            <button type="button" data-testid="screen-page-prev" disabled={paged.page <= 1} onClick={() => setPage((value) => value - 1)} style={buttonStyle}>Önceki</button>
            <span>{paged.page} / {paged.pages}</span>
            <button type="button" data-testid="screen-page-next" disabled={paged.page >= paged.pages} onClick={() => setPage((value) => value + 1)} style={buttonStyle}>Sonraki</button>
          </>
        )}
      </div>

      <div data-testid="screen-table-wrap" data-scroll="x" style={{ overflowX: "auto", maxHeight: "calc(100vh - 280px)" }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ width: 64, position: "sticky", top: 0, background: "#0c0c0c" }} />
              {columns.map((column) => (
                <th key={column.id} style={{ position: "sticky", top: 0, width: widths[column.id] ?? defaultWidth(column.id), background: "#0c0c0c", textAlign: column.align, padding: "6px 8px", borderBottom: "1px solid #2c2c2c", color: "#9a9a9a", fontWeight: 550 }}>
                  <button type="button" aria-label={`Sırala ${column.label}`} onClick={() => patch({ sortKey: column.id, sortDesc: draft.sortKey === column.id ? !draft.sortDesc : column.align === "right" })} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", font: "inherit" }}>
                    {column.label}{draft.sortKey === column.id ? (draft.sortDesc ? " ↓" : " ↑") : ""}
                  </button>
                  <span data-testid={`col-resize-${column.id}`} onPointerDown={(event) => resize(column.id, event)} style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "col-resize" }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.ticker} data-testid={`screen-row-${row.ticker}`} onClick={() => onOpen(row.ticker, false)} style={{ cursor: "pointer", borderBottom: "1px solid #1c1c1c" }}>
                <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                  <button type="button" data-testid={`screen-fav-${row.ticker}`} aria-label={`Favori ${row.ticker}`} aria-pressed={favs.includes(row.ticker)} onClick={() => mark(FAV_KEY, favs, row.ticker, setFavs)} style={{ ...buttonStyle, width: 24, padding: 0, color: favs.includes(row.ticker) ? "#f5c542" : "#777" }}>★</button>
                  <button type="button" data-testid={`screen-watch-${row.ticker}`} aria-label={`İzleme ${row.ticker}`} aria-pressed={watch.includes(row.ticker)} onClick={() => mark(WATCH_KEY, watch, row.ticker, setWatch)} style={{ ...buttonStyle, width: 24, padding: 0, color: watch.includes(row.ticker) ? "#16c47a" : "#777" }}>●</button>
                  <button type="button" data-testid={`screen-open-${row.ticker}`} aria-label={`Yeni sekmede ${row.ticker}`} onClick={() => onOpen(row.ticker, true)} style={{ ...buttonStyle, width: 24, padding: 0 }}>↗</button>
                </td>
                {columns.map((column) => (
                  <td key={column.id} style={{ width: widths[column.id] ?? defaultWidth(column.id), textAlign: column.align, padding: "6px 8px", whiteSpace: "nowrap", fontWeight: column.id === "ticker" ? 650 : 450 }}>
                    <Cell row={row} column={column} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p data-testid="screen-empty" style={{ padding: 24, textAlign: "center", color: "#9a9a9a" }}>Bu filtreye uyan hisse yok.</p>}
      </div>
    </div>
  );
}

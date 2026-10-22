import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Stock } from "@/data/stocks";
import { formatCap } from "@/data/stocks";
import { BrandMark, QuickField, ScreenField } from "@/screener/chrome";
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
import { coverageSummary, coverageText, LICENSE_NOTE } from "@/screener/coverage";
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
import "./screener.css";

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

const QUICK_NUMBERS = [
  { id: "price", label: "Fiyat >", aria: "Fiyat eşiği" },
  { id: "volume", label: "Hacim >", aria: "Hacim eşiği" },
  { id: "marketCap", label: "Piyasa değeri >", aria: "Piyasa değeri eşiği" },
  { id: "relativeVolume", label: "Göreceli hacim >", aria: "Göreceli hacim eşiği" },
  { id: "rsi", label: "RSI >", aria: "RSI eşiği" },
] as const;

const QUICK_TECH = FIELDS.filter((item) => item.group === "Teknik" || item.group === "Olay");

function textOf(row: ScreenerRow, id: string) {
  if (id === "ticker") return row.ticker;
  if (id === "name") return row.name;
  if (id === "sector") return row.sector;
  if (id === "index") return row.indexes.length ? row.indexes.join(", ") : "doğrulanmadı";
  if (id === "market") return row.market ?? "veri yok";
  if (id === "coverage") return coverageText(row);
  return "";
}

function signed(value: number) {
  const text = value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value > 0 ? "+" : ""}${text}%`;
}

function plain(value: number, digits = 2) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function toneClass(value: number | null) {
  if (value == null || value === 0) return "tone-flat";
  return value > 0 ? "tone-up" : "tone-down";
}

function defaultWidth(id: string) {
  if (id === "ticker") return 248;
  if (id === "coverage") return 220;
  if (id === "sector") return 132;
  if (id === "pe" || id === "eps" || id === "pb") return 84;
  if (id === "changeDay" || id === "earningsGrowth" || id === "revenueGrowth" || id === "dividendYield") return 124;
  return 108;
}

function tabLabel(id: TabId, label: string) {
  return id === "profit" ? "Kârlılık" : label;
}

function Cell({ row, column }: { row: ScreenerRow; column: ColumnDef }) {
  if (column.kind === "text") {
    const text = textOf(row, column.id);
    return <span className={column.id === "coverage" ? "clip" : undefined} title={text || "veri yok"}>{text || "—"}</span>;
  }
  const resolved = resolve(row, column.id);
  if (resolved == null || (column.id === "price" && resolved === 0)) return <span title="veri yok">—</span>;
  if (column.kind === "pct") return <span className={toneClass(resolved)}>{signed(resolved)}</span>;
  if (column.kind === "percent") return <span>{`${plain(resolved)}%`}</span>;
  if (column.kind === "price") {
    const up = column.id === "supertrend" ? row.technical?.supertrendUp : null;
    const tone = up == null ? undefined : up ? "tone-up" : "tone-down";
    return <span className={tone}>{plain(resolved)}</span>;
  }
  if (column.kind === "volume" || column.kind === "cap") return <span>{formatCap(resolved)}</span>;
  if (column.kind === "rel") return <span>{`${plain(resolved)}x`}</span>;
  return <span className={resolved < 0 ? "tone-down" : undefined}>{plain(resolved)}</span>;
}

function resolve(row: ScreenerRow, id: string): number | null {
  if (row.dataStatus === "missing") return null;
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

type ScanQuery = {
  rules: Rule[];
  universe: Universe;
  interval: ScreenInterval;
};

const IDLE_TEXT = "Hisseleri keşfetmek için filtre oluşturun veya hazır bir tarama seçin.";

function scanSignature(query: ScanQuery) {
  return JSON.stringify(query);
}

export function Screener({
  stocks,
  sourceLabel,
  onOpen,
  onScan,
  loadBars = true,
  pageSize = 25,
}: {
  stocks: Stock[];
  sourceLabel: string;
  onOpen: (ticker: string, blank: boolean) => void;
  onScan?: () => Promise<void> | void;
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [committed, setCommitted] = useState<ScanQuery | null>(null);
  const ruleSeq = useRef(1);

  const tickerKey = stocks.map((stock) => stock.ticker).join(",");
  const techKey = useRef("");
  const draftQuery = { rules: draft.rules, universe: draft.universe, interval: draft.interval };
  const showResults = phase === "ready" && committed != null && scanSignature(committed) === scanSignature(draftQuery);
  const barsNeeded = showResults && ((committed?.rules.some(ruleNeedsBars) ?? false) || draft.tab === "technical" || draft.tab === "performance");

  async function loadTechnicals(interval: ScreenInterval, isCancelled: () => boolean) {
    const key = `${interval}:${tickerKey}`;
    if (techKey.current === key) return;
    const tickers = tickerKey ? tickerKey.split(",") : [];
    const cached = readTechCache(interval);
    setTech((prev) => ({ ...cached, ...prev }));
    const queue = [...tickers];
    let done = 0;
    const fetched: Record<string, TechnicalSnapshot | null> = {};
    setTechNote(tickers.length ? "Teknikler yükleniyor" : "");
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (!isCancelled()) {
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
        if (!isCancelled() && (snapshot || !cached[ticker])) {
          setTech((prev) => ({ ...prev, [ticker]: snapshot ?? prev[ticker] ?? null }));
          setTechNote(`Teknikler ${done}/${tickers.length}`);
        }
      }
    });
    await Promise.all(workers);
    if (isCancelled()) return;
    const merged = { ...cached };
    for (const [ticker, snapshot] of Object.entries(fetched)) {
      if (snapshot) merged[ticker] = snapshot;
    }
    writeTechCache(interval, merged);
    setTech((prev) => ({ ...prev, ...merged }));
    techKey.current = key;
    setTechNote(Object.values(merged).some(Boolean) ? "Göstergeler kapanmış mumdan hesaplandı" : "Mum serisi alınamadı. Teknik filtreler eşleşmez.");
  }

  useEffect(() => {
    if (!loadBars || !barsNeeded) return;
    let cancel = false;
    void loadTechnicals(draft.interval, () => cancel);
    return () => {
      cancel = true;
    };
  }, [loadBars, barsNeeded, draft.interval, tickerKey]);

  useEffect(() => {
    setPage(1);
  }, [draft.rules, draft.search, draft.universe, draft.sortKey, draft.sortDesc, draft.tab, draft.interval, tickerKey]);

  const rows = useMemo(() => stocks.map((stock) => toScreenerRow(stock, tech[stock.ticker] ?? null)), [stocks, tech]);
  const summary = coverageSummary(rows);
  const membershipBlocked = (draft.universe === "bist100" || draft.universe === "bist50") && rows.every((row) => row.indexes.length === 0);
  const filtered = useMemo(() => {
    if (!showResults || !committed) return [];
    return applyScreen(rows, {
      rules: committed.rules,
      search: draft.search,
      universe: committed.universe,
      watchlist: watch,
      sortKey: draft.sortKey,
      sortDesc: draft.sortDesc,
    });
  }, [rows, showResults, committed, draft.search, draft.sortKey, draft.sortDesc, watch]);
  const searchHits = useMemo(() => {
    const words = draft.search.trim();
    if (!words || showResults || phase === "loading") return [];
    return applyScreen(rows, {
      rules: [],
      search: words,
      universe: "all",
      watchlist: [],
      sortKey: "ticker",
      sortDesc: false,
    });
  }, [rows, draft.search, showResults, phase]);
  const paged = pageOf(filtered, page, pageSize);
  const columns = visibleColumns(draft.tab, draft.columns);
  const showName = columns.some((column) => column.id === "name");
  const tableColumns = columns.filter((column) => column.id !== "name");
  const needsBars = draft.rules.some(ruleNeedsBars);
  const addFields = more ? FIELDS : FIELDS.filter((item) => item.primary);

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function revise(partial: Partial<Draft>) {
    setPhase((current) => (current === "loading" ? current : "idle"));
    setCommitted(null);
    patch(partial);
  }

  function startScan() {
    const snapshot: ScanQuery = { rules: draft.rules, universe: draft.universe, interval: draft.interval };
    const wantsBars = loadBars && (snapshot.rules.some(ruleNeedsBars) || draft.tab === "technical" || draft.tab === "performance");
    setPhase("loading");
    let cancel = false;
    void Promise.resolve()
      .then(() => onScan?.())
      .then(() => (wantsBars ? loadTechnicals(snapshot.interval, () => cancel) : undefined))
      .then(() => {
        if (cancel) return;
        setCommitted(snapshot);
        setPhase("ready");
      })
      .catch(() => {
        if (cancel) return;
        setCommitted(null);
        setPhase("error");
      });
  }

  function resetWorkspace() {
    setSavedId(null);
    setCommitted(null);
    setPhase("idle");
    setTechNote("");
    setColumnsOpen(false);
    patch({ name: "", rules: [], columns: null, search: "", tab: "overview", universe: "all", sortKey: "marketCap", sortDesc: true });
  }

  function updateRule(id: string, partial: Partial<Rule>) {
    revise({
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
    revise({ rules: [...draft.rules, { id: `n-${ruleSeq.current}`, field: field.id, op: field.ops[0], value: "", valueTo: "" }] });
  }

  function addField(fieldId: string) {
    const field = fieldById(fieldId);
    if (!field) return;
    ruleSeq.current += 1;
    revise({ rules: [...draft.rules, { id: `n-${ruleSeq.current}`, field: field.id, op: field.ops[0], value: "", valueTo: "" }] });
  }

  function setQuick(fieldId: string, value: string) {
    const existing = draft.rules.find((rule) => rule.field === fieldId);
    if (!value.trim()) {
      if (existing) revise({ rules: draft.rules.filter((rule) => rule.id !== existing.id) });
      return;
    }
    if (existing) {
      updateRule(existing.id, { value });
      return;
    }
    const field = fieldById(fieldId);
    if (!field) return;
    ruleSeq.current += 1;
    revise({ rules: [...draft.rules, { id: `n-${ruleSeq.current}`, field: fieldId, op: "gt", value, valueTo: "" }] });
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setSavedId(null);
    revise({
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
    revise({
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

  function quickValue(fieldId: string) {
    return draft.rules.find((rule) => rule.field === fieldId)?.value ?? "";
  }

  return (
    <div data-testid="screener" className="screen">
      <header className="screen-head">
        <div className="head-row">
        <div className="brand">
          <BrandMark />
          <div className="brand-text">
            <span className="brand-name">Borsa101</span>
            <h1>Hisse Filtreleme</h1>
          </div>
        </div>
        <div className="actions">
          <select data-testid="screen-saved" className="ctrl saved-select" aria-label="Kaydedilmiş filtre" value={savedId ?? ""} onChange={(event) => openSaved(event.target.value)}>
            <option value="">Kaydedilmiş filtre</option>
            {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
          </select>
          <input data-testid="screen-name" className="ctrl name-input" aria-label="Filtre adı" value={draft.name} placeholder="Filtre adı" onChange={(event) => patch({ name: event.target.value })} />
          <button type="button" className="btn" data-testid="screen-new" onClick={() => { setSavedId(null); revise({ name: "", rules: [], columns: null, tab: "overview", sortKey: "marketCap", sortDesc: true }); }}>Yeni filtre</button>
          <button type="button" className="btn" data-testid="screen-save" onClick={save} disabled={!draft.name.trim()}>Kaydet</button>
          <button type="button" className="btn" data-testid="screen-copy" onClick={copyScreen}>Kopyala</button>
          <button type="button" className="btn" data-testid="screen-delete" onClick={removeScreen} disabled={!savedId}>Sil</button>
          <button type="button" className={`btn${infoOpen ? " is-on" : ""}`} aria-expanded={infoOpen} aria-label="Veri ve kayıt notu" onClick={() => setInfoOpen((value) => !value)}>Bilgi</button>
          <a className="btn" href="#grafik">Grafik</a>
          {infoOpen && (
            <div className="info-pop" role="note">
              <p>Kayıtlar yalnız bu tarayıcıda durur. Eksik alan — kalır ve başarılı tarama sayılmaz. Pazar türü bu listede yok. {LICENSE_NOTE}</p>
              {needsBars && <p>Teknik koşullar kapanmış mum ister.</p>}
              {techNote && <p>{techNote}</p>}
            </div>
          )}
        </div>
        </div>
        {showResults && (
          <p data-testid="screen-coverage" className="meta">
            {summary.scanned} tarandı · {summary.missing} eksik · {summary.sample} örnek · {paged.total} listelenen · evren {summary.universe} · {sourceLabel}
          </p>
        )}
      </header>

      <section className="filters">
        <div className="row start-row">
          <label className="quick search-field">
            <span>Hisse arama</span>
            <input data-testid="screen-search" className="ctrl search" aria-label="Hisse ara" value={draft.search} placeholder="Sembol veya şirket" onChange={(event) => patch({ search: event.target.value })} />
          </label>
          <ScreenField label="Evren">
            <select data-testid="screen-universe" className="ctrl" aria-label="Evren" value={draft.universe} onChange={(event) => revise({ universe: event.target.value as Universe })}>
              <option value="all">Örnek liste</option>
              <option value="bist100">BIST 100</option>
              <option value="bist50">BIST 50</option>
              <option value="watch">İzleme Listesi</option>
            </select>
          </ScreenField>
          <ScreenField label="Hazır taramalar">
            <select data-testid="screen-preset" className="ctrl" aria-label="Hazır filtre" value="" onChange={(event) => applyPreset(event.target.value)}>
              <option value="">Seç</option>
              {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </ScreenField>
          <div className="row-actions">
            <button type="button" className="btn" data-testid="screen-add-filter" onClick={addRule}>Filtre ekle</button>
            <button type="button" className="btn btn-run" data-testid="screen-run" onClick={startScan} disabled={phase === "loading"}>{phase === "loading" ? "Taranıyor" : "Taramayı Başlat"}</button>
            <button type="button" className="btn" data-testid="screen-clear" onClick={resetWorkspace}>Taramayı temizle</button>
          </div>
        </div>
        {(draft.rules.length > 0 || showResults) && (
        <div className="row">
          <ScreenField label="Piyasa">
            <select className="ctrl" aria-label="Piyasa" value="TR" onChange={() => undefined}>
              <option value="TR">TR</option>
            </select>
          </ScreenField>
          <ScreenField label="Zaman dilimi">
            <select data-testid="screen-interval" className="ctrl" aria-label="Zaman dilimi" value={draft.interval} onChange={(event) => revise({ interval: event.target.value as ScreenInterval })}>
              <option value="1d">Günlük</option>
              <option value="1wk">Haftalık</option>
              <option value="4h">4s</option>
              <option value="1h">1s</option>
            </select>
          </ScreenField>
        </div>
        )}

        {(draft.rules.length > 0 || showResults) && <div className="row">
          {QUICK_NUMBERS.map((item) => (
            <QuickField key={item.id} label={item.label}>
              <input
                className={`ctrl${quickValue(item.id) ? " is-active" : ""}`}
                aria-label={item.aria}
                inputMode="decimal"
                value={quickValue(item.id)}
                placeholder="değer"
                onChange={(event) => setQuick(item.id, event.target.value)}
              />
            </QuickField>
          ))}
          <QuickField label="Teknik gösterge">
            <select className="ctrl" aria-label="Teknik gösterge" value="" onChange={(event) => { if (event.target.value) addField(event.target.value); }}>
              <option value="">Ekle</option>
              {QUICK_TECH.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </QuickField>
          <div className="row-actions">
            <button type="button" className={`btn${more ? " is-on" : ""}`} data-testid="screen-more" onClick={() => setMore((value) => !value)}>{more ? "Az filtre" : "Daha fazla filtre"}</button>
          </div>
        </div>}

        {draft.rules.length > 0 && (
          <div className="chips">
            {draft.rules.map((rule) => {
              const field = fieldById(rule.field);
              const options = field ? categoryOptions(field.id, rows) : [];
              const choices = FIELDS.filter((item) => more || item.primary || item.id === rule.field);
              return (
                <div key={rule.id} data-testid="filter-chip" className="chip">
                  <select className="ctrl" aria-label="Alan" value={rule.field} onChange={(event) => updateRule(rule.id, { field: event.target.value })}>
                    {choices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  <select className="ctrl" aria-label="Operatör" value={rule.op} onChange={(event) => updateRule(rule.id, { op: event.target.value as Operator })}>
                    {(field?.ops ?? []).map((op) => <option key={op} value={op}>{operatorLabel(op)}</option>)}
                  </select>
                  {field?.kind === "category" ? (
                    <select className="ctrl" aria-label={`${field.label} değeri`} value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })}>
                      <option value="">{options.length ? "Seç" : "veri yok"}</option>
                      {options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field && field.kind !== "flag" && field.kind !== "cross" ? (
                    <>
                      <input className="ctrl value" aria-label={`${field.label} değeri`} value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })} />
                      {rule.op === "between" && <input className="ctrl value" aria-label={`${field.label} üst değer`} value={rule.valueTo} onChange={(event) => updateRule(rule.id, { valueTo: event.target.value })} />}
                    </>
                  ) : null}
                  <button type="button" className="btn chip-remove" data-testid={`filter-remove-${rule.id}`} aria-label="Filtreyi sil" onClick={() => revise({ rules: draft.rules.filter((item) => item.id !== rule.id) })}>×</button>
                </div>
              );
            })}
          </div>
        )}
        {membershipBlocked && <p data-testid="screen-membership" className="note-banner">BIST 100 ve BIST 50 üyeliği doğrulanmış bir kaynaktan gelmediği için liste boş. Tahmini etiket kullanılmıyor.</p>}
      </section>

      {phase === "loading" && <p data-testid="screen-loading" className="status loading">Tarama çalışıyor</p>}
      {phase === "error" && <p data-testid="screen-error" className="status error">Canlı veri alınamadı. Sonuç listelenmedi.</p>}
      {!showResults && phase !== "loading" && phase !== "error" && searchHits.length === 0 && draft.search.trim() === "" && (
        <p data-testid="screen-idle" className="status idle">{IDLE_TEXT}</p>
      )}
      {!showResults && phase !== "loading" && draft.search.trim() !== "" && searchHits.length === 0 && (
        <p data-testid="screen-search-empty" className="status idle">Aramaya uyan hisse yok.</p>
      )}
      {!showResults && phase !== "loading" && searchHits.length > 0 && (
        <ul data-testid="screen-search-results" className="search-list">
          {searchHits.map((row) => (
            <li key={row.ticker}>
              <button type="button" data-testid={`screen-search-row-${row.ticker}`} onClick={() => onOpen(row.ticker, false)}>
                <span className="sym-ticker">{row.ticker}</span>
                <span className="sym-name">{row.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showResults && <div role="tablist" className="tabs">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" className="tab" aria-selected={draft.tab === tab.id} data-testid={`screen-tab-${tab.id}`} onClick={() => patch({ tab: tab.id, columns: null })}>{tabLabel(tab.id, tab.label)}</button>
        ))}
      </div>}

      {showResults && <div className="toolbar">
        <span className="count">{paged.total} hisse</span>
        <div className="pager">
          <button type="button" className="btn" data-testid="screen-page-prev" disabled={paged.page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</button>
          <span className="page-label">{paged.page} / {paged.pages}</span>
          <button type="button" className="btn" data-testid="screen-page-next" disabled={paged.page >= paged.pages} onClick={() => setPage((value) => value + 1)}>Sonraki</button>
        </div>
        <div className="toolbar-end">
          <select data-testid="screen-sort" className="ctrl sort-field" aria-label="Sıralama" value={draft.sortKey} onChange={(event) => patch({ sortKey: event.target.value, sortDesc: event.target.value !== "ticker" && event.target.value !== "name" })}>
            {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
          <button type="button" className={`btn${columnsOpen ? " is-on" : ""}`} data-testid="screen-columns" onClick={() => setColumnsOpen((value) => !value)}>Kolonlar</button>
        </div>
      </div>}
      {showResults && columnsOpen && (
        <div data-testid="screen-column-menu" className="column-menu">
          {COLUMNS.map((column) => (
            <label key={column.id}>
              <input type="checkbox" aria-label={column.label} checked={columns.some((item) => item.id === column.id)} disabled={column.id === "ticker"} onChange={() => toggleColumn(column.id)} />
              {column.label}
            </label>
          ))}
        </div>
      )}

      {showResults && <div data-testid="screen-table-wrap" data-scroll="x" className="table-wrap">
        <table className="screen-table">
          <thead>
            <tr>
              {tableColumns.map((column) => {
                const sorted = draft.sortKey === column.id;
                return (
                  <th key={column.id} className={column.id === "ticker" ? "sym-col" : undefined} style={{ width: widths[column.id] ?? defaultWidth(column.id), textAlign: column.align }}>
                    <button type="button" className={`sort-btn${sorted ? " is-sorted" : ""}`} aria-label={`Sırala ${column.label}`} onClick={() => patch({ sortKey: column.id, sortDesc: draft.sortKey === column.id ? !draft.sortDesc : column.align === "right" })} style={{ justifyContent: column.align === "right" ? "flex-end" : "flex-start" }}>
                      {column.label}
                      <span className="sort-mark" aria-hidden="true">{sorted ? (draft.sortDesc ? "↓" : "↑") : ""}</span>
                    </button>
                    <span data-testid={`col-resize-${column.id}`} className="resize" onPointerDown={(event) => resize(column.id, event)} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.ticker} data-testid={`screen-row-${row.ticker}`} onClick={() => onOpen(row.ticker, false)}>
                {tableColumns.map((column) => (
                  <td key={column.id} className={column.id === "ticker" ? "sym-col" : undefined} style={{ width: widths[column.id] ?? defaultWidth(column.id), textAlign: column.align }}>
                    {column.id === "ticker" ? (
                      <div className="sym">
                        <span className="sym-actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className={`icon-btn${favs.includes(row.ticker) ? " is-fav" : ""}`} data-testid={`screen-fav-${row.ticker}`} aria-label={`Favori ${row.ticker}`} aria-pressed={favs.includes(row.ticker)} onClick={() => mark(FAV_KEY, favs, row.ticker, setFavs)}>★</button>
                          <button type="button" className={`icon-btn${watch.includes(row.ticker) ? " is-watch" : ""}`} data-testid={`screen-watch-${row.ticker}`} aria-label={`İzleme ${row.ticker}`} aria-pressed={watch.includes(row.ticker)} onClick={() => mark(WATCH_KEY, watch, row.ticker, setWatch)}>●</button>
                          <button type="button" className="icon-btn" data-testid={`screen-open-${row.ticker}`} aria-label={`Yeni sekmede ${row.ticker}`} onClick={() => onOpen(row.ticker, true)}>↗</button>
                        </span>
                        <span className="sym-text">
                          <span className="sym-ticker">{row.ticker}</span>
                          {showName && <span className="sym-name">{row.name}</span>}
                        </span>
                      </div>
                    ) : (
                      <Cell row={row} column={column} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p data-testid="screen-empty" className="empty">Bu filtreye uyan hisse yok.</p>}
      </div>}
    </div>
  );
}

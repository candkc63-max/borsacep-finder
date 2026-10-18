import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { browseCharts, choiceById, choiceIntervals, searchCharts, type ChartChoice } from "../lib/chartSearch";

const RECENT_KEY = "borsa101-chart-recent";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function remember(id: string) {
  const next = [id, ...readRecent().filter((item) => item !== id)].slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* depolama kapalıysa arama yine çalışır */
  }
  return next;
}

type Section = { label: string; items: ChartChoice[] };

function sectionsFor(query: string, recentIds: string[]): Section[] {
  const trimmed = query.trim();
  if (!trimmed) {
    const recent = recentIds.flatMap((id) => {
      const item = choiceById(id);
      return item ? [item] : [];
    });
    const seen = new Set(recent.map((item) => item.id));
    const browse = browseCharts();
    return [
      { label: "Son bakılanlar", items: recent },
      { label: "Endeksler", items: browse.indexes.filter((item) => !seen.has(item.id)) },
      { label: "Hisseler", items: browse.stocks.filter((item) => !seen.has(item.id)) },
    ].filter((section) => section.items.length > 0);
  }
  const found = searchCharts(trimmed);
  return [
    { label: "Endeksler", items: found.filter((item) => item.group === "endeks") },
    { label: "Hisseler", items: found.filter((item) => item.group === "hisse") },
  ].filter((section) => section.items.length > 0);
}

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "min(460px, 100%)",
  minHeight: 44,
  padding: "0 12px",
  background: "#111111",
  color: "#f2f2f2",
  border: "1px solid #3a3a3a",
  borderRadius: 10,
  cursor: "pointer",
  textAlign: "left",
};

export function SymbolSearch({ choice, onPick }: { choice: ChartChoice; onPick: (next: ChartChoice) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sections = useMemo(() => sectionsFor(query, recentIds), [query, recentIds]);
  const flat = sections.flatMap((section) => section.items);
  const intervals = choiceIntervals(choice.id);

  useEffect(() => {
    setRecentIds(readRecent());
  }, []);

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  function choose(next: ChartChoice) {
    setRecentIds(remember(next.id));
    setQuery("");
    setOpen(false);
    onPick(next);
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => Math.min(flat.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter" && flat[cursor]) {
      event.preventDefault();
      choose(flat[cursor]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  let row = 0;

  return (
    <div ref={boxRef} data-testid="symbol-search" style={{ position: "relative", flex: "1 1 280px", maxWidth: 460 }}>
      <button type="button" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((value) => !value)} style={buttonStyle}>
        <span style={{ font: "650 15px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: "0.04em" }}>{choice.symbol}</span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#c8c8c8", font: "13px/1.2 ui-sans-serif, system-ui, sans-serif" }}>{choice.name}</span>
        <span style={{ color: "#9a9a9a", font: "12px/1 ui-sans-serif, system-ui, sans-serif" }}>{choice.interval}</span>
      </button>
      {intervals.length > 1 && (
        <div role="group" aria-label="Zaman dilimi" style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {intervals.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === choice.id}
              onClick={() => choose(item)}
              style={{
                minWidth: 36,
                minHeight: 28,
                padding: "0 8px",
                borderRadius: 7,
                border: "1px solid #3a3a3a",
                background: item.id === choice.id ? "#f2f2f2" : "#161616",
                color: item.id === choice.id ? "#111" : "#f2f2f2",
                font: "12px/1 ui-sans-serif, system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              {item.interval}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div style={{ position: "absolute", zIndex: 40, top: 48, left: 0, width: "min(460px, 100%)", background: "#0e0e0e", border: "1px solid #2e2e2e", borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.45)", overflow: "hidden" }}>
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls="symbol-results"
            placeholder="Sembol, şirket veya sektör"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKey}
            style={{ width: "100%", boxSizing: "border-box", border: "none", borderBottom: "1px solid #2a2a2a", background: "#111", color: "#f2f2f2", minHeight: 42, padding: "0 12px", font: "14px/1 ui-sans-serif, system-ui, sans-serif", outline: "none" }}
          />
          <div id="symbol-results" role="listbox" style={{ maxHeight: 420, overflow: "auto" }}>
            {flat.length === 0 && <div style={{ padding: 12, color: "#777", font: "13px/1.4 ui-sans-serif, system-ui, sans-serif" }}>Eşleşen sembol yok</div>}
            {sections.map((section) => (
              <div key={section.label}>
                <div style={{ padding: "8px 12px 4px", color: "#777", font: "11px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: "0.08em" }}>{section.label.toLocaleUpperCase("tr")}</div>
                {section.items.map((item) => {
                  const index = row;
                  row += 1;
                  const active = index === cursor;
                  return (
                    <button
                      key={`${section.label}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={item.id === choice.id}
                      data-testid="symbol-option"
                      onMouseEnter={() => setCursor(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(item)}
                      ref={(node) => {
                        if (active) node?.scrollIntoView({ block: "nearest" });
                      }}
                      style={{ display: "grid", gridTemplateColumns: "76px 1fr auto", gap: 8, alignItems: "center", width: "100%", padding: "8px 12px", border: "none", background: active ? "#1c1c1c" : "transparent", color: "#f2f2f2", cursor: "pointer", textAlign: "left" }}
                    >
                      <span style={{ font: "650 13px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: "0.03em" }}>{item.symbol}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "13px/1.2 ui-sans-serif, system-ui, sans-serif" }}>{item.name}</span>
                        <span style={{ display: "block", color: "#8d8d8d", font: "11px/1.3 ui-sans-serif, system-ui, sans-serif" }}>{item.group === "hisse" ? item.sector : "Endeks"}</span>
                      </span>
                      <span style={{ color: "#9a9a9a", font: "12px/1 ui-sans-serif, system-ui, sans-serif" }}>{item.interval}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

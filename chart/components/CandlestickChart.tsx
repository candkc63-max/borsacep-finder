"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import * as echarts from "echarts";
import { candleOption, windowPercent } from "../lib/candleChart";
import { replayDelay, replayFocus, replaySlice, stepCursor } from "../lib/indicators";
import { NAS100_CHOICE, searchCharts, type ChartChoice } from "../lib/chartSearch";
import { simulateManual, validateManualOrder, type ManualOrder, type Side } from "../lib/manualBacktest";
import { parseOhlcvCsv, type OhlcBar } from "../lib/parseOhlcv";
import { parseJsonResponse } from "../lib/readJson";

const RANGES = [
  { label: "2 gün", bars: 48 },
  { label: "5 gün", bars: 120 },
  { label: "20 gün", bars: 480 },
  { label: "Tümü", bars: 100000 },
];

const SPEEDS = [0.5, 1, 2, 5, 10];

type Replay = {
  cursor: number;
  start: number;
  playing: boolean;
  speed: number;
  following: boolean;
};

function price(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

function reasonLabel(reason: string | null) {
  if (reason === "stop" || reason === "gap-stop") return "stop";
  if (reason === "target" || reason === "gap-target") return "hedef";
  if (reason === "manual") return "manuel";
  return "";
}

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 4,
  background: "#111111",
  color: "#f2f2f2",
  border: "1px solid #3a3a3a",
  borderRadius: 8,
  minHeight: 36,
  padding: "0 8px",
  fontSize: 14,
};

function clock(time: string) {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
}

export function CandlestickChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const spanRef = useRef(windowPercent(1000, 120));
  const viewSpanRef = useRef(100);
  const expectedZoom = useRef<{ start: number; end: number } | null>(null);
  const lastWindowRef = useRef<number | null>(null);
  const userWindowRef = useRef<{ start: number; end: number } | null>(null);
  const applyingZoom = useRef(false);
  const replayRef = useRef<Replay | null>(null);
  const [rows, setRows] = useState<OhlcBar[] | null>(null);
  const [choice, setChoice] = useState<ChartChoice>(NAS100_CHOICE);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<OhlcBar | null>(null);
  const [range, setRange] = useState(120);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [capitalText, setCapitalText] = useState("10000");
  const [feeText, setFeeText] = useState("0.05");
  const [sizeText, setSizeText] = useState("1");
  const [entryText, setEntryText] = useState("");
  const [stopText, setStopText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [formError, setFormError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelHeight, setPanelHeight] = useState(188);
  const [dock, setDock] = useState<"islem" | "gecmis" | "replay">("islem");
  const orderId = useRef(1);
  replayRef.current = replay;

  useEffect(() => {
    let cancel = false;
    setReplay(null);
    setOrders([]);
    setFormError("");
    setError("");
    const load = choice.source === "csv"
      ? fetch("/CAPITALCOM_NAS100_60.csv").then(async (response) => {
          if (!response.ok) throw new Error("CSV alınamadı");
          return parseOhlcvCsv(await response.text());
        })
      : fetch(`/api/chart-bars?id=${encodeURIComponent(choice.id)}`).then(async (response) => {
          const body = parseJsonResponse(await response.text(), response.headers.get("content-type") ?? "", response.status) as { bars?: OhlcBar[]; error?: string };
          if (!response.ok || !body.bars?.length) throw new Error(body.error || "Grafik alınamadı");
          return body.bars;
        });
    load
      .then((parsed) => {
        if (cancel) return;
        setRows(parsed);
        setActive(parsed[parsed.length - 1] ?? null);
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "Grafik alınamadı");
      });
    return () => {
      cancel = true;
    };
  }, [choice]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !rows?.length) return;
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    spanRef.current = windowPercent(rows.length, 120);
    chart.setOption(candleOption(rows, 120));
    const pick = (index: number) => {
      const limit = replayRef.current ? replayRef.current.cursor : rows.length - 1;
      if (index < 0 || index > limit) return;
      const row = rows[index];
      if (row) setActive(row);
    };
    chart.on("updateAxisPointer", (raw) => {
      const event = raw as { axesInfo?: Array<{ value?: number | string }> };
      const value = event.axesInfo?.[0]?.value;
      if (typeof value === "number") pick(value);
      else if (typeof value === "string") pick(rows.findIndex((row) => row.label === value));
    });
    chart.getZr().on("click", (event) => {
      if (replayRef.current) return;
      const point = [event.offsetX, event.offsetY];
      const inside = chart.containPixel({ gridIndex: 0 }, point) || chart.containPixel("grid", point);
      if (!inside) return;
      const raw = chart.convertFromPixel({ seriesIndex: 0 }, point);
      const value = Array.isArray(raw) ? raw[0] : raw;
      const index = typeof value === "number" && Number.isFinite(value)
        ? Math.round(value)
        : rows.findIndex((row) => row.label === String(value));
      if (!Number.isFinite(index) || index < 0 || index >= rows.length) return;
      viewSpanRef.current = 100;
      setPanelOpen(true);
      setDock("islem");
      const next = { cursor: index, start: index, playing: false, speed: 1, following: true };
      replayRef.current = next;
      setReplay(next);
      setActive(rows[index] ?? null);
    });
    const applyZoom = (start: number, end: number) => {
      applyingZoom.current = true;
      expectedZoom.current = { start, end };
      lastWindowRef.current = end - start;
      chart.dispatchAction({ type: "dataZoom", startValue: start, endValue: end });
      applyingZoom.current = false;
    };
    chart.on("datazoom", () => {
      if (applyingZoom.current) return;
      const option = chart.getOption() as { dataZoom?: Array<{ start?: number; end?: number; startValue?: number; endValue?: number }> };
      const zoom = option.dataZoom?.[0];
      const start = zoom?.startValue;
      const end = zoom?.endValue;
      if (expectedZoom.current && start != null && end != null && Math.abs(start - expectedZoom.current.start) < 0.6 && Math.abs(end - expectedZoom.current.end) < 0.6) return;
      const current = replayRef.current;
      if (!current) {
        if (zoom?.start != null && zoom?.end != null) spanRef.current = { start: zoom.start, end: zoom.end };
        return;
      }
      if (start == null || end == null) return;
      const width = end - start;
      const previous = lastWindowRef.current;
      const zoomed = previous != null && Math.abs(width - previous) > Math.max(1.2, previous * 0.02);
      if (zoomed) {
        viewSpanRef.current = Math.max(30, Math.round(width * 0.85));
        if (current.following) {
          const focus = replayFocus(current.cursor, viewSpanRef.current);
          applyZoom(focus.startValue, focus.endValue);
          setReplay((value) => (value ? { ...value } : value));
        } else {
          userWindowRef.current = { start, end };
          lastWindowRef.current = width;
        }
        return;
      }
      userWindowRef.current = { start, end };
      if (!current.following) return;
      const next = { ...current, following: false };
      replayRef.current = next;
      setReplay(next);
    });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [rows]);

  const capital = Number(capitalText);
  const feeRate = Number(feeText);
  const rate = Number.isFinite(feeRate) ? feeRate / 100 : 0;
  const book = useMemo(() => {
    if (!replay || !rows?.length || !Number.isFinite(capital)) return null;
    return simulateManual(orders, rows, replay.cursor, rate, capital);
  }, [replay, rows, orders, capital, rate]);

  useEffect(() => {
    if (!replay || !rows?.[replay.cursor]) return;
    setEntryText(String(rows[replay.cursor].close));
  }, [replay?.cursor, rows]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !rows?.length || !replay) return;
    const prefix = replaySlice(rows, replay.cursor);
    const focus = replayFocus(replay.cursor, viewSpanRef.current);
    const frozen = !replay.following ? userWindowRef.current : null;
    const axisMin = frozen ? Math.min(frozen.start, focus.startValue, 0) : focus.axisMin;
    const axisMax = frozen ? Math.max(frozen.end, replay.cursor) : focus.axisMax;
    const option = candleOption(prefix, 120, { axisMin, axisMax, trades: book?.marks ?? [] });
    delete option.dataZoom;
    const window = frozen ?? { start: focus.startValue, end: focus.endValue };
    applyingZoom.current = true;
    expectedZoom.current = window;
    lastWindowRef.current = window.end - window.start;
    chart.setOption(option, { replaceMerge: ["series", "xAxis", "yAxis", "grid", "legend"] });
    chart.dispatchAction({ type: "dataZoom", startValue: window.start, endValue: window.end });
    applyingZoom.current = false;
    setActive(prefix[prefix.length - 1] ?? null);
  }, [replay, rows, book]);

  useEffect(() => {
    if (!replay?.playing || !rows?.length) return undefined;
    const timer = window.setInterval(() => {
      setReplay((current) => {
        if (!current?.playing) return current;
        if (current.cursor >= rows.length - 1) return { ...current, playing: false };
        return { ...current, cursor: current.cursor + 1 };
      });
    }, replayDelay(replay.speed));
    return () => window.clearInterval(timer);
  }, [replay?.playing, replay?.speed, rows]);

  function showBars(bars: number) {
    setRange(bars);
    if (replayRef.current && chartRef.current && rows?.length) {
      viewSpanRef.current = Math.max(30, Math.min(bars, rows.length));
      setReplay({ ...replayRef.current, following: true });
      return;
    }
    if (!rows?.length || !chartRef.current) return;
    const next = windowPercent(rows.length, bars);
    spanRef.current = next;
    chartRef.current.dispatchAction({ type: "dataZoom", start: next.start, end: next.end });
  }

  function jumpToEnd() {
    if (replayRef.current) {
      setReplay({ ...replayRef.current, following: true });
      return;
    }
    if (!chartRef.current) return;
    const width = Math.max(2, spanRef.current.end - spanRef.current.start);
    const start = Math.max(0, 100 - width);
    spanRef.current = { start, end: 100 };
    chartRef.current.dispatchAction({ type: "dataZoom", start, end: 100 });
  }

  function exitReplay() {
    setReplay(null);
    setOrders([]);
    setFormError("");
    if (rows?.length && chartRef.current) {
      chartRef.current.setOption(candleOption(rows, 120), { replaceMerge: ["series", "xAxis", "yAxis", "grid", "legend", "dataZoom"] });
      setActive(rows[rows.length - 1] ?? null);
    }
  }

  function place(direction: Side) {
    if (!replay || !rows?.[replay.cursor]) return;
    const next: ManualOrder = {
      id: `emir-${orderId.current}`,
      entryCursor: replay.cursor,
      direction,
      entry: Number(entryText),
      size: Number(sizeText),
      stop: Number(stopText),
      target: Number(targetText),
      manualExit: null,
    };
    const problem = validateManualOrder(next, rows[replay.cursor]);
    if (problem) {
      setFormError(problem);
      return;
    }
    orderId.current += 1;
    setFormError("");
    setOrders((list) => [...list, next]);
  }

  function closeAtMarket(id: string) {
    if (!replay || !rows?.[replay.cursor]) return;
    const price = rows[replay.cursor].close;
    setOrders((list) => list.map((item) => (item.id === id && item.manualExit == null ? { ...item, manualExit: { cursor: replay.cursor, price } } : item)));
  }

  function resizePanel(event: ReactPointerEvent<HTMLDivElement>) {
    const startY = event.clientY;
    const startH = panelHeight;
    const move = (pointer: PointerEvent | MouseEvent) => {
      setPanelHeight(Math.min(window.innerHeight * 0.5, Math.max(132, startH - (pointer.clientY - startY))));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
  }

  function showTrade(entryCursor: number) {
    if (!replay) return;
    setReplay({ ...replay, cursor: entryCursor, playing: false, following: true });
  }

  function pickChart(next: ChartChoice) {
    setMenuOpen(false);
    setQuery("");
    setChoice(next);
  }

  const playhead = replay && rows ? rows[replay.cursor] : null;
  const previous = rows && active ? rows[Math.max(0, rows.indexOf(active) - 1)] : undefined;
  const change = active && previous && previous !== active ? active.close - previous.close : null;

  const buttonStyle = (on: boolean): CSSProperties => ({
    background: on ? "#ffffff" : "#161616",
    color: on ? "#111111" : "#f2f2f2",
    border: "1px solid #3a3a3a",
    borderRadius: 8,
    minHeight: 36,
    padding: "0 12px",
    fontSize: 14,
    cursor: "pointer",
  });

  const found = searchCharts(query);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#000" }}>
      <div style={{ position: "relative", padding: "8px 12px 0" }}>
        <input
          value={query}
          placeholder="Hisse veya endeks ara"
          onFocus={() => setMenuOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setMenuOpen(true);
          }}
          onBlur={() => setMenuOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && found[0]) pickChart(found[0]);
            if (event.key === "Escape") setMenuOpen(false);
          }}
          style={{ ...fieldStyle, width: "min(420px, 100%)", marginTop: 0, minHeight: 40 }}
        />
        <span style={{ marginLeft: 12, color: "#cfcfcf", font: "13px/1.4 ui-sans-serif, system-ui, sans-serif" }}>{choice.title} · {choice.detail}</span>
        {menuOpen && (
          <div style={{ position: "absolute", zIndex: 30, top: 52, left: 12, width: "min(420px, calc(100% - 24px))", background: "#111", border: "1px solid #3a3a3a", borderRadius: 10, maxHeight: 320, overflow: "auto" }}>
            {found.length === 0 && <div style={{ padding: 10, color: "#777" }}>Sonuç yok</div>}
            {found.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickChart(item)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: item.id === choice.id ? "#1c1c1c" : "transparent", color: "#f2f2f2", border: "none", cursor: "pointer", font: "14px/1.3 ui-sans-serif, system-ui, sans-serif" }}
              >
                {item.title} · {item.detail}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "6px 12px", color: "#cfcfcf", font: "12px/1.4 ui-sans-serif, system-ui, sans-serif" }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {active
            ? `${active.label}  A ${price(active.open)}  Y ${price(active.high)}  D ${price(active.low)}  K ${price(active.close)}`
            : "Mum yükleniyor"}
          {change != null && (
            <b style={{ color: change < 0 ? "#e10600" : "#ffffff", fontWeight: 600 }}>
              {"  "}{change > 0 ? "+" : ""}{price(change)}
            </b>
          )}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {RANGES.map((item) => (
            <button key={item.label} type="button" onClick={() => showBars(item.bars)} style={buttonStyle(range === item.bars)}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={jumpToEnd} style={buttonStyle(false)}>Sona</button>
        </span>
      </div>
      {error && <p style={{ color: "#e10600", margin: "0 12px 4px" }}>{error}</p>}
      <div ref={ref} style={{ flex: 1, minHeight: 160 }} />
      {panelOpen ? (
        <>
          <div data-testid="term-handle" onPointerDown={resizePanel} style={{ height: 6, cursor: "ns-resize", background: "#161616", borderTop: "1px solid #2c2c2c" }} />
          <section data-testid="term-dock" style={{ height: panelHeight, minHeight: 0, display: "flex", flexDirection: "column", background: "#0c0c0c", borderTop: "1px solid #2c2c2c", color: "#f2f2f2", font: "12px/1.4 ui-sans-serif, system-ui, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #2c2c2c", overflowX: "auto" }}>
              {([
                ["islem", "İşlem"],
                ["gecmis", "Geçmiş"],
                ["replay", "Replay"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={dock === id} onClick={() => setDock(id)} style={{ ...buttonStyle(false), minHeight: 28, border: 0, borderBottom: dock === id ? "2px solid #f2f2f2" : "2px solid transparent", borderRadius: 0, background: "transparent", color: dock === id ? "#f2f2f2" : "#9a9a9a" }}>
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setPanelOpen(false)} style={{ ...buttonStyle(false), minHeight: 28, marginLeft: "auto" }}>Kapat</button>
            </div>
            <div role="tabpanel" style={{ overflow: "auto", padding: "8px 10px", minHeight: 0 }}>
              {dock === "islem" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
                    <button type="button" disabled={!replay} onClick={() => place("long")} style={{ ...buttonStyle(false), minWidth: 64, color: "#111", background: "#f2f2f2", opacity: replay ? 1 : 0.45 }}>AL</button>
                    <button type="button" disabled={!replay} onClick={() => place("short")} style={{ ...buttonStyle(false), minWidth: 64, background: "#e10600", borderColor: "#e10600", opacity: replay ? 1 : 0.45 }}>SAT</button>
                    <label>Büyüklük<input disabled={!replay} value={sizeText} onChange={(event) => setSizeText(event.target.value)} style={{ ...fieldStyle, width: 72 }} /></label>
                    <label>Giriş<input disabled={!replay} value={entryText} onChange={(event) => setEntryText(event.target.value)} style={{ ...fieldStyle, width: 100 }} /></label>
                    <label>Stop Loss<input disabled={!replay} value={stopText} onChange={(event) => setStopText(event.target.value)} style={{ ...fieldStyle, width: 100 }} /></label>
                    <label>Take Profit<input disabled={!replay} value={targetText} onChange={(event) => setTargetText(event.target.value)} style={{ ...fieldStyle, width: 100 }} /></label>
                    <label>Sermaye<input value={capitalText} onChange={(event) => setCapitalText(event.target.value)} style={{ ...fieldStyle, width: 100 }} /></label>
                    <label>Komisyon %<input value={feeText} onChange={(event) => setFeeText(event.target.value)} style={{ ...fieldStyle, width: 72 }} /></label>
                  </div>
                  {formError && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{formError}</p>}
                  {!replay && <p style={{ margin: 0, color: "#9a9a9a" }}>İşlem için grafikte bir muma tıkla. Hesap yalnız o ana kadar gelen mumları kullanır.</p>}
                  {book && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                      <span>Başlangıç <b>{money(book.startingCapital)}</b></span>
                      <span>Bakiye <b>{money(book.equity)}</b></span>
                      <span>Gerçekleşen <b style={{ color: book.realized < 0 ? "#e10600" : "#f2f2f2" }}>{signed(book.realized)}</b></span>
                      <span>Açık <b>{signed(book.unrealized)}</b></span>
                    </div>
                  )}
                  <div>
                    {(!book || book.open.length === 0) && <span style={{ color: "#9a9a9a" }}>Açık pozisyon yok</span>}
                    {book?.open.map((trade) => (
                      <div key={trade.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span>{trade.direction === "long" ? "Long" : "Short"} · {trade.size} · giriş {price(trade.entry)} · stop {price(trade.stop)} · hedef {price(trade.target)} · {signed(trade.unrealized ?? 0)}</span>
                        <button type="button" onClick={() => closeAtMarket(trade.id)} style={buttonStyle(false)}>Kapat</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dock === "gecmis" && (
                <div>
                  {(!rows || !book || book.closed.length === 0) && <p style={{ margin: 0, color: "#9a9a9a" }}>Kapanan işlem yok.</p>}
                  {rows && book?.closed.map((trade) => (
                    <button key={trade.id} type="button" onClick={() => showTrade(trade.entryCursor)} style={{ display: "block", width: "100%", textAlign: "left", marginTop: 6, padding: "6px 8px", background: "#111", color: "#f2f2f2", border: "1px solid #2c2c2c", borderRadius: 4, cursor: "pointer" }}>
                      {clock(rows[trade.entryCursor].time)} · {trade.direction === "long" ? "Long" : "Short"} · {trade.size} · giriş {price(trade.entry)} · çıkış {trade.exit == null ? "—" : price(trade.exit)} · {reasonLabel(trade.reason)} · <span style={{ color: (trade.net ?? 0) < 0 ? "#e10600" : "#f2f2f2" }}>{signed(trade.net ?? 0)}</span>
                    </button>
                  ))}
                </div>
              )}
              {dock === "replay" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{playhead ? clock(playhead.time) : "Başlamak için bir muma tıkla"}</span>
                    <span>{replay && rows ? `${replay.cursor + 1} / ${rows.length}` : rows ? `${rows.length} mum` : ""}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (rows?.length ?? 1) - 1)}
                    value={replay?.cursor ?? 0}
                    disabled={!replay}
                    aria-label="Replay konumu"
                    onChange={(event) => {
                      if (!replay) return;
                      setReplay({ ...replay, playing: false, cursor: Number(event.target.value), following: true });
                    }}
                    style={{ width: "100%", accentColor: "#f2f2f2" }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, playing: !replay.playing })} style={buttonStyle(!!replay?.playing)}>{replay?.playing ? "Duraklat" : "Oynat"}</button>
                    <button type="button" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, -1, rows.length - 1) })} style={buttonStyle(false)}>Geri</button>
                    <button type="button" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, 1, rows.length - 1) })} style={buttonStyle(false)}>İleri</button>
                    {SPEEDS.map((speed) => (
                      <button key={speed} type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, speed })} style={buttonStyle(replay?.speed === speed)}>{speed}x</button>
                    ))}
                    <button type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, cursor: replay.start, following: true })} style={buttonStyle(false)}>Başa dön</button>
                    <button type="button" disabled={!replay} onClick={exitReplay} style={buttonStyle(false)}>Çık</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 8px", borderTop: "1px solid #2c2c2c", background: "#0c0c0c" }}>
          <button type="button" onClick={() => setPanelOpen(true)} style={buttonStyle(false)}>Paneli aç</button>
        </div>
      )}
    </div>
  );
}

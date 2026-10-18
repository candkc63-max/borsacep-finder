"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as echarts from "echarts";
import { candleOption, windowPercent } from "../lib/candleChart";
import { choiceById, NAS100_CHOICE, searchCharts, type ChartChoice } from "../lib/chartSearch";
import { intervalsFor, type ChartPoint, type ChartPrefs, type Drawing } from "../lib/chartPrefs";
import { replayDelay, replayFocus, replaySlice, stepCursor } from "../lib/indicators";
import { simulateManual, validateManualOrder, type ManualOrder, type Side } from "../lib/manualBacktest";
import { parseOhlcvCsv, type OhlcBar } from "../lib/parseOhlcv";
import { BottomDock, type DockTab } from "./terminal/BottomDock";
import { TopBar } from "./terminal/TopBar";
import { ToolRail, type DrawTool } from "./terminal/ToolRail";
import "./terminal/terminal.css";

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

function clock(time: string) {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
}

export function CandlestickChart() {
  const shellRef = useRef<HTMLDivElement>(null);
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
  const [panelHeight, setPanelHeight] = useState(280);
  const [tab, setTab] = useState<DockTab>("strateji");
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [draft, setDraft] = useState<ChartPoint | null>(null);
  const [chartType, setChartType] = useState<"mum" | "cizgi">("mum");
  const [ema5, setEma5] = useState(false);
  const [ema8, setEma8] = useState(false);
  const [ema13, setEma13] = useState(false);
  const [rsiOn, setRsiOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [lastPrice, setLastPrice] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [arm, setArm] = useState(false);
  const orderId = useRef(1);
  const toolRef = useRef<DrawTool>("cursor");
  const armRef = useRef(false);
  const draftRef = useRef<ChartPoint | null>(null);
  const prefsRef = useRef<ChartPrefs | null>(null);
  replayRef.current = replay;
  toolRef.current = tool;
  armRef.current = arm;
  draftRef.current = draft;

  useEffect(() => {
    let cancel = false;
    setReplay(null);
    setOrders([]);
    setRows(null);
    setActive(null);
    setFormError("");
    setError("");
    const load = choice.source === "csv"
      ? fetch("/CAPITALCOM_NAS100_60.csv").then(async (response) => {
          if (!response.ok) throw new Error("CSV alınamadı");
          return parseOhlcvCsv(await response.text());
        })
      : fetch(`/api/chart-bars?id=${encodeURIComponent(choice.id)}`).then(async (response) => {
          const body = await response.json() as { bars?: OhlcBar[]; error?: string };
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
      const point = [event.offsetX, event.offsetY];
      const inside = chart.containPixel({ gridIndex: 0 }, point) || chart.containPixel("grid", point);
      if (!inside) return;
      const raw = chart.convertFromPixel({ seriesIndex: 0 }, point);
      const value = Array.isArray(raw) ? raw[0] : raw;
      const index = typeof value === "number" && Number.isFinite(value)
        ? Math.round(value)
        : rows.findIndex((row) => row.label === String(value));
      const priceValue = Array.isArray(raw) ? Number(raw[1]) : Number.NaN;
      const activeTool = toolRef.current;
      if (activeTool !== "cursor") {
        if (!Number.isFinite(index) || index < 0 || index >= rows.length || !Number.isFinite(priceValue)) return;
        if (activeTool === "hline") {
          setDrawings((list) => [...list, { id: `cizim-${Date.now()}`, kind: "hline", price: priceValue }]);
          return;
        }
        const currentDraft = draftRef.current;
        if (!currentDraft) {
          const nextDraft = { index, price: priceValue };
          draftRef.current = nextDraft;
          setDraft(nextDraft);
          return;
        }
        setDrawings((list) => [...list, {
          id: `cizim-${Date.now()}`,
          kind: activeTool,
          a: currentDraft,
          b: { index, price: priceValue },
        }]);
        draftRef.current = null;
        setDraft(null);
        return;
      }
      if (replayRef.current && !armRef.current) return;
      if (!Number.isFinite(index) || index < 0 || index >= rows.length) return;
      if (armRef.current) {
        armRef.current = false;
        setArm(false);
        setOrders([]);
      }
      viewSpanRef.current = 100;
      setPanelOpen(true);
      setTab("replay");
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

  useEffect(() => {
    const read = () => setNarrow(window.innerWidth < 760);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const prefs = useMemo<ChartPrefs>(() => ({
    chartType,
    ema5,
    ema8,
    ema13,
    rsi: rsiOn,
    grid: gridOn,
    lastPrice,
    drawings,
  }), [chartType, ema5, ema8, ema13, rsiOn, gridOn, lastPrice, drawings]);
  prefsRef.current = prefs;

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
    const option = candleOption(prefix, 120, { axisMin, axisMax, trades: book?.marks ?? [] }, prefs);
    delete option.dataZoom;
    const window = frozen ?? { start: focus.startValue, end: focus.endValue };
    applyingZoom.current = true;
    expectedZoom.current = window;
    lastWindowRef.current = window.end - window.start;
    chart.setOption(option, { replaceMerge: ["series", "xAxis", "yAxis", "grid", "legend"] });
    chart.dispatchAction({ type: "dataZoom", startValue: window.start, endValue: window.end });
    applyingZoom.current = false;
    setActive(prefix[prefix.length - 1] ?? null);
  }, [replay, rows, book, prefs]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !rows?.length || replay) return;
    const option = candleOption(rows, range, null, prefs);
    delete option.dataZoom;
    chart.setOption(option, { replaceMerge: ["series", "xAxis", "yAxis", "grid", "legend"] });
  }, [prefs, rows, range, replay]);

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
      chartRef.current.setOption(candleOption(rows, 120, null, prefsRef.current ?? undefined), { replaceMerge: ["series", "xAxis", "yAxis", "grid", "legend", "dataZoom"] });
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

  function onInterval(id: string) {
    const next = choiceById(id);
    if (next && next.id !== choice.id) pickChart(next);
  }

  function toggleIndicator(key: "ema5" | "ema8" | "ema13" | "rsi") {
    if (key === "ema5") setEma5((value) => !value);
    if (key === "ema8") setEma8((value) => !value);
    if (key === "ema13") setEma13((value) => !value);
    if (key === "rsi") setRsiOn((value) => !value);
  }

  function clearDrawings() {
    draftRef.current = null;
    setDraft(null);
    setDrawings([]);
  }

  function chooseTool(next: DrawTool) {
    draftRef.current = null;
    setDraft(null);
    setTool(next);
  }

  function armStart() {
    setTool("cursor");
    setArm(true);
    setPanelOpen(true);
    setTab("replay");
  }

  function onResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startH = panelHeight;
    const move = (clientY: number) => {
      setPanelHeight(Math.min(window.innerHeight * 0.62, Math.max(140, startH - (clientY - startY))));
    };
    const onPointer = (pointer: PointerEvent) => move(pointer.clientY);
    const onMouse = (pointer: MouseEvent) => move(pointer.clientY);
    const up = () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
  }

  function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen();
  }

  const found = searchCharts(query);
  const quote = active
    ? `${choice.title}  ${active.label}  A ${price(active.open)}  Y ${price(active.high)}  D ${price(active.low)}  K ${price(active.close)}`
    : `${choice.title} yükleniyor`;

  const strategy = (
    <div>
      <p className="term-note">{replay ? "Long için AL, short için SAT. Stop ve hedef grafik çizgisi olur." : "İşlem açmak için önce Bar Replay başlat. Grafikte bir muma tıkla."}</p>
      <div className="term-row">
        <button type="button" className="term-btn term-buy" disabled={!replay} onClick={() => place("long")}>AL</button>
        <button type="button" className="term-btn term-sell" disabled={!replay} onClick={() => place("short")}>SAT</button>
        <label className="term-label">Miktar<input className="term-field" disabled={!replay} value={sizeText} onChange={(event) => setSizeText(event.target.value)} /></label>
        <label className="term-label">Giriş<input className="term-field" disabled={!replay} value={entryText} onChange={(event) => setEntryText(event.target.value)} /></label>
        <label className="term-label">Stop Loss<input className="term-field" disabled={!replay} value={stopText} onChange={(event) => setStopText(event.target.value)} /></label>
        <label className="term-label">Take Profit<input className="term-field" disabled={!replay} value={targetText} onChange={(event) => setTargetText(event.target.value)} /></label>
        <label className="term-label">Sermaye<input className="term-field" value={capitalText} onChange={(event) => setCapitalText(event.target.value)} /></label>
        <label className="term-label">Komisyon %<input className="term-field" value={feeText} onChange={(event) => setFeeText(event.target.value)} /></label>
      </div>
      {formError && <p className="term-down">{formError}</p>}
      <div style={{ marginTop: 10 }}>
        <strong>Açık pozisyon</strong>
        {(!book || book.open.length === 0) && <span className="term-note"> yok</span>}
        {book?.open.map((trade) => (
          <div key={trade.id} className="term-row" style={{ marginTop: 6 }}>
            <span>{trade.direction === "long" ? "Long" : "Short"} · {trade.size} · giriş {price(trade.entry)} · stop {price(trade.stop)} · hedef {price(trade.target)} · {signed(trade.unrealized ?? 0)}</span>
            <button type="button" className="term-btn" onClick={() => closeAtMarket(trade.id)}>Kapat</button>
          </div>
        ))}
      </div>
    </div>
  );

  const history = (
    <div>
      {(!rows || !book || book.closed.length === 0) && <p className="term-note">Kapanan işlem yok.</p>}
      {rows && book && book.closed.length > 0 && (
        <table className="term-table">
          <thead>
            <tr><th>Zaman</th><th>Yön</th><th>Giriş</th><th>Çıkış</th><th>Neden</th><th>Sonuç</th></tr>
          </thead>
          <tbody>
            {book.closed.map((trade) => (
              <tr key={trade.id}>
                <td><button type="button" className="term-btn" onClick={() => showTrade(trade.entryCursor)}>{clock(rows[trade.entryCursor].time)}</button></td>
                <td>{trade.direction === "long" ? "Long" : "Short"}</td>
                <td>{price(trade.entry)}</td>
                <td>{trade.exit == null ? "—" : price(trade.exit)}</td>
                <td>{reasonLabel(trade.reason)}</td>
                <td className={(trade.net ?? 0) < 0 ? "term-down" : "term-up"}>{signed(trade.net ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const performance = (
    <div className="term-stats">
      <div className="term-stat"><span>Sanal bakiye</span><b>{book ? money(book.equity) : "—"}</b></div>
      <div className="term-stat"><span>Gerçekleşen</span><b className={book && book.realized < 0 ? "term-down" : "term-up"}>{book ? signed(book.realized) : "—"}</b></div>
      <div className="term-stat"><span>Açık kâr/zarar</span><b>{book ? signed(book.unrealized) : "—"}</b></div>
      <div className="term-stat"><span>Kazanan / kaybeden</span><b>{book ? `${book.wins} / ${book.losses}` : "—"}</b></div>
      <div className="term-stat"><span>Kazanma oranı</span><b>{book && book.wins + book.losses > 0 ? `%${((book.wins / (book.wins + book.losses)) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "—"}</b></div>
      <div className="term-stat"><span>Kâr faktörü</span><b>{book ? (book.profitFactor == null ? "—" : book.profitFactor.toLocaleString("tr-TR", { maximumFractionDigits: 2 })) : "—"}</b></div>
      <div className="term-stat"><span>Maks. düşüş</span><b>{book ? money(book.maxDrawdown) : "—"}</b></div>
    </div>
  );

  const replayPane = (
    <div>
      <p className="term-note">
        {arm ? "Başlangıç mumu için grafiğe tıkla." : replay ? `${playhead ? clock(playhead.time) : ""} · ${replay.cursor + 1} / ${rows?.length ?? 0}` : "Başlangıç için grafiğe tıkla ya da aşağıdaki düğmeyi kullan."}
        {draft ? " İlk nokta seçildi. İkinci noktayı tıkla." : ""}
      </p>
      <div className="term-row">
        <button type="button" className={arm ? "term-btn on" : "term-btn"} onClick={armStart}>Başlangıç seç</button>
        <button type="button" className={replay?.playing ? "term-btn on" : "term-btn"} disabled={!replay} onClick={() => replay && setReplay({ ...replay, playing: !replay.playing })}>{replay?.playing ? "Duraklat" : "Oynat"}</button>
        <button type="button" className="term-btn" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, -1, rows.length - 1) })}>Geri</button>
        <button type="button" className="term-btn" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, 1, rows.length - 1) })}>İleri</button>
        {SPEEDS.map((speed) => (
          <button key={speed} type="button" className={replay?.speed === speed ? "term-btn on" : "term-btn"} disabled={!replay} onClick={() => replay && setReplay({ ...replay, speed })}>{speed}x</button>
        ))}
        <button type="button" className="term-btn" disabled={!replay} onClick={() => replay && setReplay({ ...replay, cursor: replay.start, following: true })}>Başa dön</button>
        <button type="button" className="term-btn" disabled={!replay} onClick={exitReplay}>Çık</button>
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
        style={{ width: "100%", marginTop: 10, accentColor: "#f2f2f2" }}
      />
    </div>
  );

  const panes = { strateji: strategy, gecmis: history, performans: performance, replay: replayPane };

  return (
    <div ref={shellRef} className={narrow ? "term narrow" : "term"} data-testid="terminal">
      <TopBar
        query={query}
        onQuery={setQuery}
        menuOpen={menuOpen}
        onMenu={setMenuOpen}
        results={found}
        onPick={pickChart}
        onSearchKey={(key) => {
          if (key === "Enter" && found[0]) pickChart(found[0]);
          if (key === "Escape") setMenuOpen(false);
        }}
        choice={choice}
        intervals={intervalsFor(choice)}
        onInterval={onInterval}
        chartType={chartType}
        onChartType={setChartType}
        indicators={{ ema5, ema8, ema13, rsi: rsiOn }}
        onIndicator={toggleIndicator}
        grid={gridOn}
        lastPrice={lastPrice}
        onGrid={() => setGridOn((value) => !value)}
        onLastPrice={() => setLastPrice((value) => !value)}
        onBars={showBars}
        onJump={jumpToEnd}
        replayOn={!!replay}
        onReplay={() => {
          setPanelOpen(true);
          setTab("replay");
        }}
        onFullscreen={toggleFullscreen}
        quote={quote}
        change={change}
      />
      {error && <p className="term-down" style={{ margin: "4px 8px" }}>{error}</p>}
      <div className="term-body">
        <ToolRail tool={tool} onTool={chooseTool} onClear={clearDrawings} />
        <div className="term-stage">
          <div ref={ref} className="term-chart" data-testid="term-chart" />
          <BottomDock
            open={panelOpen}
            height={panelHeight}
            tab={tab}
            onTab={setTab}
            onClose={() => setPanelOpen(false)}
            onOpen={() => setPanelOpen(true)}
            onResizeStart={onResizeStart}
            replayStrip={replay ? (
              <>
                <button type="button" className="term-btn" onClick={() => setReplay({ ...replay, playing: !replay.playing })}>{replay.playing ? "Duraklat" : "Oynat"}</button>
                <button type="button" className="term-btn" onClick={exitReplay}>Çık</button>
              </>
            ) : null}
          >
            {panes[tab]}
          </BottomDock>
        </div>
      </div>
    </div>
  );
}

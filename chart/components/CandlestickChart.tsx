"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as echarts from "echarts";
import { candleOption, windowPercent } from "../lib/candleChart";
import { replayDelay, replayFocus, replaySlice, stepCursor } from "../lib/indicators";
import { simulateManual, validateManualOrder, type ManualOrder, type Side } from "../lib/manualBacktest";
import { parseOhlcvCsv, type OhlcBar } from "../lib/parseOhlcv";

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
  const orderId = useRef(1);
  replayRef.current = replay;

  useEffect(() => {
    let cancel = false;
    fetch("/CAPITALCOM_NAS100_60.csv")
      .then((response) => {
        if (!response.ok) throw new Error("CSV alınamadı");
        return response.text();
      })
      .then((text) => {
        if (cancel) return;
        const parsed = parseOhlcvCsv(text);
        setRows(parsed);
        setActive(parsed[parsed.length - 1] ?? null);
      })
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "CSV alınamadı");
      });
    return () => {
      cancel = true;
    };
  }, []);

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

  function showTrade(entryCursor: number) {
    if (!replay) return;
    setReplay({ ...replay, cursor: entryCursor, playing: false, following: true });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#000" }}>
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
      <p style={{ margin: "0 12px 4px", color: "#777", font: "11px/1.3 ui-sans-serif, system-ui, sans-serif" }}>
        {replay ? "Replay açık. AL ve SAT alttaki çubuktadır." : "Bir muma tıkla. Replay açılınca AL, SAT, Stop Loss ve Take Profit altta açılır."}
      </p>
      {error && <p style={{ color: "#e10600", padding: "0 12px" }}>{error}</p>}
      <div ref={ref} style={{ flex: 1, minHeight: 0 }} />
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 12px 14px" }}>
        <div style={{ width: "min(980px, 100%)", background: "#0c0c0c", border: "1px solid #3a3a3a", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button type="button" disabled={!replay} onClick={() => place("long")} style={{ ...buttonStyle(false), minWidth: 88, minHeight: 44, color: "#9dffc8", fontWeight: 700, opacity: replay ? 1 : 0.45 }}>AL</button>
            <button type="button" disabled={!replay} onClick={() => place("short")} style={{ ...buttonStyle(false), minWidth: 88, minHeight: 44, color: "#ffb4b0", fontWeight: 700, opacity: replay ? 1 : 0.45 }}>SAT</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f2f2f2", font: "14px/1.2 ui-sans-serif, system-ui, sans-serif" }}>
              Stop Loss
              <input disabled={!replay} placeholder="fiyat" value={stopText} onChange={(event) => setStopText(event.target.value)} style={{ ...fieldStyle, width: 120, marginTop: 0, borderColor: "#8a8a8a" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f2f2f2", font: "14px/1.2 ui-sans-serif, system-ui, sans-serif" }}>
              Take Profit
              <input disabled={!replay} placeholder="fiyat" value={targetText} onChange={(event) => setTargetText(event.target.value)} style={{ ...fieldStyle, width: 120, marginTop: 0, borderColor: "#8a8a8a" }} />
            </label>
            <button type="button" disabled={!replay} onClick={() => setPanelOpen((open) => !open)} style={{ ...buttonStyle(panelOpen), opacity: replay ? 1 : 0.45 }}>
              {panelOpen ? "Paneli kapat" : "İşlem paneli"}
            </button>
            {formError && <span style={{ color: "#e10600", fontSize: 13 }}>{formError}</span>}
          </div>
          {replay && book && rows && panelOpen && (
            <div style={{ color: "#f2f2f2", font: "13px/1.4 ui-sans-serif, system-ui, sans-serif" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <span>Sanal bakiye <b>{money(book.equity)}</b></span>
                <span>Gerçekleşen kâr/zarar <b style={{ color: book.realized < 0 ? "#e10600" : "#ffffff" }}>{signed(book.realized)}</b></span>
                <span>Açık kâr/zarar <b>{signed(book.unrealized)}</b></span>
                <span>Kazanan / kaybeden <b>{book.wins} / {book.losses}</b></span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <label>Sermaye<input value={capitalText} onChange={(event) => setCapitalText(event.target.value)} style={{ ...fieldStyle, width: 110 }} /></label>
                <label>Komisyon %<input value={feeText} onChange={(event) => setFeeText(event.target.value)} style={{ ...fieldStyle, width: 80 }} /></label>
                <label>Giriş<input value={entryText} onChange={(event) => setEntryText(event.target.value)} style={{ ...fieldStyle, width: 120 }} /></label>
                <label>Miktar<input value={sizeText} onChange={(event) => setSizeText(event.target.value)} style={{ ...fieldStyle, width: 80 }} /></label>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Açık pozisyon</strong>
                {book.open.length === 0 && <span style={{ color: "#777" }}> — yok</span>}
                {book.open.map((trade) => (
                  <div key={trade.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <span>{trade.direction === "long" ? "Long" : "Short"} · {trade.size} · giriş {price(trade.entry)} · stop {price(trade.stop)} · hedef {price(trade.target)} · {signed(trade.unrealized ?? 0)}</span>
                    <button type="button" onClick={() => closeAtMarket(trade.id)} style={buttonStyle(false)}>Kapat</button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, maxHeight: 120, overflow: "auto" }}>
                <strong>İşlem geçmişi</strong>
                {book.closed.length === 0 && <span style={{ color: "#777" }}> — kapanan işlem yok</span>}
                {book.closed.map((trade) => (
                  <button key={trade.id} type="button" onClick={() => showTrade(trade.entryCursor)} style={{ display: "block", width: "100%", textAlign: "left", marginTop: 6, padding: "6px 8px", background: "#111", color: "#f2f2f2", border: "1px solid #2c2c2c", borderRadius: 8, cursor: "pointer" }}>
                    {clock(rows[trade.entryCursor].time)} · {trade.direction === "long" ? "Long" : "Short"} · giriş {price(trade.entry)} · çıkış {trade.exit == null ? "—" : price(trade.exit)} · {reasonLabel(trade.reason)} · <span style={{ color: (trade.net ?? 0) < 0 ? "#e10600" : "#ffffff" }}>{signed(trade.net ?? 0)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#f2f2f2", font: "14px/1.3 ui-sans-serif, system-ui, sans-serif" }}>
            <span>{playhead ? clock(playhead.time) : "Başlamak için bir muma tıkla"}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#cfcfcf" }}>
              {replay && rows ? `${replay.cursor + 1} / ${rows.length}` : rows ? `${rows.length} mum` : ""}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, (rows?.length ?? 1) - 1)}
            value={replay?.cursor ?? (rows ? rows.length - 1 : 0)}
            disabled={!replay}
            onChange={(event) => {
              if (!replay) return;
              setReplay({ ...replay, playing: false, cursor: Number(event.target.value), following: true });
            }}
            style={{ width: "100%", accentColor: "#ffffff" }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <button type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, playing: !replay.playing })} style={buttonStyle(!!replay?.playing)}>
              {replay?.playing ? "Duraklat" : "Oynat"}
            </button>
            <button type="button" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, -1, rows.length - 1) })} style={buttonStyle(false)}>
              Geri
            </button>
            <button type="button" disabled={!replay || !rows} onClick={() => replay && rows && setReplay({ ...replay, cursor: stepCursor(replay.cursor, 1, rows.length - 1) })} style={buttonStyle(false)}>
              İleri
            </button>
            {SPEEDS.map((speed) => (
              <button key={speed} type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, speed })} style={buttonStyle(replay?.speed === speed)}>
                {speed}x
              </button>
            ))}
            <button type="button" disabled={!replay} onClick={() => replay && setReplay({ ...replay, cursor: replay.start, following: true })} style={buttonStyle(false)}>
              Başa dön
            </button>
            <button type="button" disabled={!replay} onClick={exitReplay} style={buttonStyle(false)}>
              Çık
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

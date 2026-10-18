"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { candleOption, windowPercent } from "../lib/candleChart";
import { parseOhlcvCsv, type OhlcBar } from "../lib/parseOhlcv";

const RANGES = [
  { label: "2 gün", bars: 48 },
  { label: "5 gün", bars: 120 },
  { label: "20 gün", bars: 480 },
  { label: "Tümü", bars: 100000 },
];

function price(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function CandlestickChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const spanRef = useRef(windowPercent(1000, 120));
  const [rows, setRows] = useState<OhlcBar[] | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<OhlcBar | null>(null);
  const [range, setRange] = useState(120);

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
      const row = rows[index];
      if (row) setActive(row);
    };
    chart.on("updateAxisPointer", (raw) => {
      const event = raw as { axesInfo?: Array<{ value?: number | string }> };
      const value = event.axesInfo?.[0]?.value;
      if (typeof value === "number") pick(value);
      else if (typeof value === "string") pick(rows.findIndex((row) => row.label === value));
    });
    chart.on("datazoom", () => {
      const option = chart.getOption() as { dataZoom?: Array<{ start?: number; end?: number }> };
      const zoom = option.dataZoom?.[0];
      if (zoom?.start != null && zoom?.end != null) spanRef.current = { start: zoom.start, end: zoom.end };
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

  function showBars(bars: number) {
    if (!rows?.length || !chartRef.current) return;
    const next = windowPercent(rows.length, bars);
    spanRef.current = next;
    setRange(bars);
    chartRef.current.dispatchAction({ type: "dataZoom", start: next.start, end: next.end });
  }

  function jumpToEnd() {
    if (!chartRef.current) return;
    const width = Math.max(2, spanRef.current.end - spanRef.current.start);
    const start = Math.max(0, 100 - width);
    spanRef.current = { start, end: 100 };
    chartRef.current.dispatchAction({ type: "dataZoom", start, end: 100 });
  }

  const previous = rows && active ? rows[rows.indexOf(active) - 1] : undefined;
  const change = active && previous ? active.close - previous.close : null;

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
            <button
              key={item.label}
              type="button"
              onClick={() => showBars(item.bars)}
              style={{
                background: range === item.bars ? "#ffffff" : "transparent",
                color: range === item.bars ? "#111" : "#cfcfcf",
                border: "1px solid #333",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
          <button type="button" onClick={jumpToEnd} style={{ background: "transparent", color: "#cfcfcf", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
            Sona
          </button>
        </span>
      </div>
      <p style={{ margin: "0 12px 4px", color: "#777", font: "11px/1.3 ui-sans-serif, system-ui, sans-serif" }}>
        Sürükle: kaydır. Tekerlek: yakınlaştır.
      </p>
      {error && <p style={{ color: "#e10600", padding: "0 12px" }}>{error}</p>}
      <div ref={ref} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}

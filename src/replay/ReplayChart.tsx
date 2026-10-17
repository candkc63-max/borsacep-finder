import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Bar } from "@/data/bars";
import type { ReplayTrade } from "./book";

export function ReplayChart({ bars, trades }: { bars: Bar[]; trades: ReplayTrade[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: "rgba(14,17,21,0.2)" }, textColor: "#c5cdd6" },
      grid: { vertLines: { color: "rgba(255,255,255,0.06)" }, horzLines: { color: "rgba(255,255,255,0.06)" } },
      width: ref.current.clientWidth,
      height: 420,
      timeScale: { borderColor: "rgba(255,255,255,0.12)", timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#3d9a6a",
      downColor: "#c45c5c",
      borderVisible: false,
      wickUpColor: "#3d9a6a",
      wickDownColor: "#c45c5c",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const onResize = () => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || bars.length === 0) return;
    series.setData(bars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    })));
    const visible = new Set(bars.map((bar) => bar.time));
    series.setMarkers(trades.flatMap((trade) => {
      const marks = [];
      const entry = bars[trade.entryIndex];
      if (entry && visible.has(entry.time)) {
        marks.push({
          time: entry.time as UTCTimestamp,
          position: trade.side === "long" ? "belowBar" as const : "aboveBar" as const,
          color: trade.side === "long" ? "#3d9a6a" : "#c45c5c",
          shape: trade.side === "long" ? "arrowUp" as const : "arrowDown" as const,
          text: trade.side === "long" ? "Al" : "Sat",
        });
      }
      if (trade.exitIndex != null) {
        const exit = bars[trade.exitIndex];
        if (exit && visible.has(exit.time)) {
          marks.push({
            time: exit.time as UTCTimestamp,
            position: "aboveBar" as const,
            color: "#c9a227",
            shape: "circle" as const,
            text: "Kapat",
          });
        }
      }
      return marks;
    }));
    chart.timeScale().scrollToRealTime();
  }, [bars, trades]);

  return <div ref={ref} className="h-[420px] w-full" />;
}

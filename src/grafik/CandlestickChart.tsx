import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { dummyOhlcv } from "../../chart/lib/dummyOhlcv";

const UP = "#ffffff";
const DOWN = "#e10600";

function ohlcFrom(data: unknown): [number, number, number, number] | null {
  if (!Array.isArray(data)) return null;
  const numbers = data.filter((value): value is number => typeof value === "number");
  if (numbers.length < 4) return null;
  const [open, close, low, high] = numbers.slice(-4);
  return [open, close, low, high];
}

export function CandlestickChart() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    const rows = dummyOhlcv();
    const dates = rows.map((row) => row.time);
    const candles = rows.map((row) => [row.open, row.close, row.low, row.high]);
    const volumes = rows.map((row) => ({
      value: row.volume,
      itemStyle: { color: row.close >= row.open ? "rgba(255,255,255,0.8)" : "rgba(225,6,0,0.9)" },
    }));

    chart.setOption({
      backgroundColor: "#000000",
      animation: false,
      axisPointer: {
        link: [{ xAxisIndex: "all" }],
        label: { backgroundColor: "#222222" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          lineStyle: { color: "#8a8a8a", width: 1 },
          crossStyle: { color: "#8a8a8a" },
        },
        backgroundColor: "#111111",
        borderColor: "#333333",
        textStyle: { color: "#f2f2f2", fontSize: 12 },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params];
          const candle = list.find((item) => (item as { seriesType?: string }).seriesType === "candlestick") as { axisValue?: string; data?: unknown } | undefined;
          const volumeItem = list.find((item) => (item as { seriesType?: string }).seriesType === "bar") as { data?: { value?: number } | number } | undefined;
          const ohlc = ohlcFrom(candle?.data);
          if (!ohlc) return "";
          const [open, close, low, high] = ohlc;
          const volume = typeof volumeItem?.data === "number" ? volumeItem.data : volumeItem?.data?.value;
          const price = (value: number) => value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return [
            candle?.axisValue ?? "",
            `Açılış ${price(open)}`,
            `Yüksek ${price(high)}`,
            `Düşük ${price(low)}`,
            `Kapanış ${price(close)}`,
            volume == null ? "" : `Hacim ${Math.round(volume).toLocaleString("tr-TR")}`,
          ].filter(Boolean).join("<br/>");
        },
      },
      grid: [
        { left: 16, right: 76, top: 24, height: "62%" },
        { left: 16, right: 76, top: "76%", height: "14%" },
      ],
      xAxis: [
        {
          type: "category",
          data: dates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: "#333333" } },
          axisLabel: { color: "#9a9a9a" },
          axisTick: { show: false },
          splitLine: { show: false },
          min: "dataMin",
          max: "dataMax",
        },
        {
          type: "category",
          gridIndex: 1,
          data: dates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: "#333333" } },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          min: "dataMin",
          max: "dataMax",
        },
      ],
      yAxis: [
        {
          scale: true,
          position: "right",
          axisLine: { lineStyle: { color: "#333333" } },
          axisLabel: { color: "#d6d6d6" },
          splitLine: { lineStyle: { color: "#1c1c1c" } },
        },
        {
          scale: true,
          gridIndex: 1,
          position: "right",
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1], start: 55, end: 100 },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          bottom: 8,
          height: 18,
          start: 55,
          end: 100,
          borderColor: "#222222",
          backgroundColor: "#050505",
          fillerColor: "rgba(255,255,255,0.08)",
          handleStyle: { color: "#888888", borderColor: "#888888" },
          textStyle: { color: "#8a8a8a" },
          dataBackground: {
            lineStyle: { color: "#555555" },
            areaStyle: { color: "#161616" },
          },
        },
      ],
      series: [
        {
          name: "Fiyat",
          type: "candlestick",
          data: candles,
          itemStyle: {
            color: UP,
            color0: DOWN,
            borderColor: UP,
            borderColor0: DOWN,
          },
        },
        {
          name: "Hacim",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          barMaxWidth: 8,
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, []);

  return <div ref={ref} style={{ width: "100%", height: "100%", background: "#000000" }} />;
}

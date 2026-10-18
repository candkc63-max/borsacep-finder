import type { EChartsCoreOption } from "echarts";
import type { OhlcBar } from "./parseOhlcv";

const UP = "#ffffff";
const DOWN = "#e10600";

function price(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function windowPercent(total: number, bars: number): { start: number; end: number } {
  if (total <= 1 || bars >= total) return { start: 0, end: 100 };
  const count = Math.max(20, bars);
  return { start: ((total - count) / total) * 100, end: 100 };
}

export function candleOption(rows: OhlcBar[], visibleBars = 120): EChartsCoreOption {
  const hasVolume = rows.some((row) => row.volume != null && row.volume > 0);
  const view = windowPercent(rows.length, visibleBars);
  const last = rows[rows.length - 1];
  const labels = rows.map((row) => row.label);
  const candles = rows.map((row) => [row.open, row.close, row.low, row.high]);
  const volumes = rows.map((row) => ({
    value: row.volume ?? 0,
    itemStyle: { color: row.close >= row.open ? "rgba(255,255,255,0.8)" : "rgba(225,6,0,0.9)" },
  }));

  return {
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
        const list = (Array.isArray(params) ? params : [params]) as Array<{ seriesType?: string; dataIndex?: number; data?: unknown }>;
        const candle = list.find((item) => item.seriesType === "candlestick");
        const row = candle?.dataIndex == null ? undefined : rows[candle.dataIndex];
        if (!row) return "";
        const lines = [
          row.time.replace("T", " ").slice(0, 16),
          `Açılış ${price(row.open)}`,
          `Yüksek ${price(row.high)}`,
          `Düşük ${price(row.low)}`,
          `Kapanış ${price(row.close)}`,
        ];
        if (row.volume != null) lines.push(`Hacim ${Math.round(row.volume).toLocaleString("tr-TR")}`);
        return lines.join("<br/>");
      },
    },
    grid: hasVolume
      ? [
          { left: 16, right: 96, top: 24, height: "62%" },
          { left: 16, right: 96, top: "76%", height: "14%" },
        ]
      : [{ left: 16, right: 96, top: 16, bottom: 52 }],
    xAxis: [
      {
        type: "category",
        data: labels,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "#333333" } },
        axisLabel: { color: "#9a9a9a" },
        axisTick: { show: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      },
      ...(hasVolume
        ? [{
            type: "category" as const,
            gridIndex: 1,
            data: labels,
            boundaryGap: true,
            axisLine: { lineStyle: { color: "#333333" } },
            axisLabel: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            min: "dataMin",
            max: "dataMax",
          }]
        : []),
    ],
    yAxis: [
      {
        scale: true,
        position: "right",
        axisLine: { lineStyle: { color: "#333333" } },
        axisLabel: {
          color: "#d6d6d6",
          formatter: (value: number) => price(value),
        },
        splitLine: { lineStyle: { color: "#1c1c1c" } },
        min: (value: { min: number; max: number }) => value.min - (value.max - value.min) * 0.08,
        max: (value: { min: number; max: number }) => value.max + (value.max - value.min) * 0.08,
      },
      ...(hasVolume
        ? [{
            scale: true,
            gridIndex: 1,
            position: "right" as const,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
          }]
        : []),
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: hasVolume ? [0, 1] : [0],
        start: view.start,
        end: view.end,
        filterMode: "filter",
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: true,
        throttle: 30,
      },
      {
        type: "slider",
        xAxisIndex: hasVolume ? [0, 1] : [0],
        bottom: 8,
        height: 22,
        start: view.start,
        end: view.end,
        filterMode: "filter",
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
        barMaxWidth: 12,
        markLine: last
          ? {
              symbol: "none",
              silent: true,
              animation: false,
              lineStyle: { color: last.close >= last.open ? "#ffffff" : DOWN, type: "dashed", width: 1 },
              label: {
                show: true,
                position: "end",
                formatter: price(last.close),
                color: last.close >= last.open ? "#111111" : "#ffffff",
                backgroundColor: last.close >= last.open ? "#ffffff" : DOWN,
                padding: [3, 5],
                borderRadius: 2,
              },
              data: [{ yAxis: last.close }],
            }
          : undefined,
      },
      ...(hasVolume
        ? [{
            name: "Hacim",
            type: "bar" as const,
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: volumes,
            barMaxWidth: 8,
          }]
        : []),
    ],
  };
}

import type { EChartsCoreOption } from "echarts";
import type { OhlcBar } from "./parseOhlcv";

const UP = "#ffffff";
const DOWN = "#e10600";

function price(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function candleOption(rows: OhlcBar[]): EChartsCoreOption {
  const hasVolume = rows.some((row) => row.volume != null && row.volume > 0);
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
          { left: 16, right: 84, top: 24, height: "62%" },
          { left: 16, right: 84, top: "76%", height: "14%" },
        ]
      : [{ left: 16, right: 84, top: 24, bottom: 48 }],
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
      { type: "inside", xAxisIndex: hasVolume ? [0, 1] : [0], start: 78, end: 100 },
      {
        type: "slider",
        xAxisIndex: hasVolume ? [0, 1] : [0],
        bottom: 8,
        height: 18,
        start: 78,
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

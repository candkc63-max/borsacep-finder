import type { EChartsCoreOption } from "echarts";
import { ema, rsi } from "./indicators";
import type { TradeMark } from "./manualBacktest";
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

function line(name: string, data: Array<number | null>, color: string, pane = 0) {
  return {
    name,
    type: "line" as const,
    xAxisIndex: pane,
    yAxisIndex: pane,
    data,
    showSymbol: false,
    connectNulls: false,
    lineStyle: { width: 1.2, color },
    itemStyle: { color },
  };
}

export function candleOption(
  rows: OhlcBar[],
  visibleBars = 120,
  replay: { axisMin: number; axisMax: number; trades?: TradeMark[] } | null = null,
): EChartsCoreOption {
  const hasVolume = !replay && rows.some((row) => row.volume != null && row.volume > 0);
  const lower = replay ? "rsi" : hasVolume ? "volume" : "none";
  const view = windowPercent(rows.length, visibleBars);
  const last = rows[rows.length - 1];
  const labels = rows.map((row) => row.label);
  const candles = rows.map((row) => [row.open, row.close, row.low, row.high]);
  const closes = rows.map((row) => row.close);
  const ema5 = replay ? ema(closes, 5) : [];
  const rsi14 = replay ? rsi(closes, 14) : [];
  const volumes = rows.map((row) => ({
    value: row.volume ?? 0,
    itemStyle: { color: row.close >= row.open ? "rgba(255,255,255,0.8)" : "rgba(225,6,0,0.9)" },
  }));
  const categoryAxis = (pane: number, showLabel: boolean) => ({
    type: "category" as const,
    gridIndex: pane,
    data: labels,
    boundaryGap: true,
    axisLine: { lineStyle: { color: "#333333" } },
    axisLabel: showLabel ? { color: "#9a9a9a" } : { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    min: replay ? replay.axisMin : ("dataMin" as const),
    max: replay ? replay.axisMax : ("dataMax" as const),
  });

  return {
    backgroundColor: "#000000",
    animation: false,
    legend: replay
      ? { show: true, data: ["EMA 5", "EMA 8", "EMA 13"], top: 0, left: 12, textStyle: { color: "#9a9a9a" }, itemHeight: 8 }
      : { show: false },
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
        const list = (Array.isArray(params) ? params : [params]) as Array<{ seriesType?: string; seriesName?: string; dataIndex?: number; data?: unknown }>;
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
        if (replay && candle?.dataIndex != null) {
          const emaValue = ema5[candle.dataIndex];
          const rsiValue = rsi14[candle.dataIndex];
          if (emaValue != null) lines.push(`EMA 5 ${price(emaValue)}`);
          if (rsiValue != null) lines.push(`RSI ${rsiValue.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`);
        }
        return lines.join("<br/>");
      },
    },
    grid: lower === "none"
      ? [{ left: 16, right: 96, top: 16, bottom: 52 }]
      : [
          { left: 16, right: 96, top: replay ? 28 : 16, height: "62%" },
          { left: 16, right: 96, top: "76%", height: "12%" },
        ],
    xAxis: lower === "none" ? [categoryAxis(0, true)] : [categoryAxis(0, true), categoryAxis(1, false)],
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
      ...(lower === "volume"
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
      ...(lower === "rsi"
        ? [{
            gridIndex: 1,
            position: "right" as const,
            min: 0,
            max: 100,
            interval: 50,
            axisLabel: { color: "#9a9a9a", formatter: (value: number) => `${value}` },
            axisLine: { lineStyle: { color: "#333333" } },
            splitLine: { lineStyle: { color: "#1c1c1c" } },
          }]
        : []),
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: lower === "none" ? [0] : [0, 1],
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
        xAxisIndex: lower === "none" ? [0] : [0, 1],
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
        barWidth: replay ? "68%" : undefined,
        barMaxWidth: replay ? undefined : 12,
        markPoint: replay?.trades?.length
          ? {
              silent: true,
              animation: false,
              data: replay.trades.flatMap((trade) => {
                const entry = {
                  coord: [trade.entryIndex, trade.entryPrice],
                  symbol: "circle",
                  symbolSize: 12,
                  itemStyle: { color: trade.entryBuy ? "#16c47a" : DOWN },
                  label: { show: false },
                };
                if (trade.exitIndex == null || trade.exitPrice == null) return [entry];
                return [
                  entry,
                  {
                    coord: [trade.exitIndex, trade.exitPrice],
                    symbol: "circle",
                    symbolSize: 12,
                    itemStyle: { color: trade.exitBuy ? "#16c47a" : DOWN },
                    label: { show: false },
                  },
                ];
              }),
            }
          : undefined,
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
              data: [
                { yAxis: last.close },
                ...(replay?.trades ?? []).flatMap((trade) => [
                  ...(trade.stop == null
                    ? []
                    : [{
                        yAxis: trade.stop,
                        lineStyle: { color: DOWN, type: "solid" as const, width: 1 },
                        label: { show: true, formatter: "Stop", color: DOWN, position: "insideEndTop" as const },
                      }]),
                  ...(trade.target == null
                    ? []
                    : [{
                        yAxis: trade.target,
                        lineStyle: { color: "#16c47a", type: "solid" as const, width: 1 },
                        label: { show: true, formatter: "Hedef", color: "#16c47a", position: "insideEndBottom" as const },
                      }]),
                ]),
              ],
            }
          : undefined,
      },
      ...(replay
        ? [
            line("EMA 5", ema5, "#d0d0d0"),
            line("EMA 8", ema(closes, 8), "#c9a227"),
            line("EMA 13", ema(closes, 13), "#7aa2ff"),
            line("RSI", rsi14, "#c9a227", 1),
          ]
        : []),
      ...(lower === "volume"
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

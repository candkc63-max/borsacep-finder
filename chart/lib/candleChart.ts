import type { EChartsCoreOption } from "echarts";
import { strategyMarks, type StrategyReport } from "./emaCross";
import { adx, atr, ema, rsi } from "./indicators";
import { indicatorLine, type LineSpec } from "./moreIndicators";
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

export type ChartOverlay = {
  fastPeriod?: number;
  slowPeriod?: number;
  marks: TradeMark[];
  emas?: number[];
  rsiPeriods?: number[];
  adxPeriods?: number[];
  atrPeriods?: number[];
  studies?: Array<{ label: string; pane: "price" | "osc"; spec: LineSpec }>;
};

const EMA_COLORS = ["#f5c542", "#7aa2ff", "#c9a227", "#d0d0d0", "#16c47a", "#9ad0ff"];

function uniquePeriods(periods: number[] | undefined) {
  return [...new Set((periods ?? []).filter((period) => Number.isInteger(period) && period >= 1))];
}

export function overlayFromReport(report: StrategyReport): ChartOverlay | null {
  if (!report.ok) return null;
  const indicators = report.indicators ?? { emas: [report.spec.fast, report.spec.slow], rsi: [], adx: [], atr: [] };
  const marks = strategyMarks(report.trades);
  const studies = indicators.studies ?? [];
  const plain = studies.length === 0
    && indicators.rsi.length === 0 && indicators.adx.length === 0 && indicators.atr.length === 0
    && indicators.emas.length === 2
    && indicators.emas[0] === report.spec.fast
    && indicators.emas[1] === report.spec.slow;
  if (plain) return { fastPeriod: report.spec.fast, slowPeriod: report.spec.slow, marks };
  return {
    fastPeriod: indicators.emas[0],
    slowPeriod: indicators.emas[1],
    emas: indicators.emas,
    rsiPeriods: indicators.rsi,
    adxPeriods: indicators.adx,
    atrPeriods: indicators.atr,
    studies,
    marks,
  };
}

export function candleOption(
  rows: OhlcBar[],
  visibleBars = 120,
  replay: { axisMin: number; axisMax: number; trades?: TradeMark[] } | null = null,
  overlay: ChartOverlay | null = null,
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
  const strategyOscillators = overlay
    ? [
        ...uniquePeriods(overlay.rsiPeriods).map((period) => ({ name: `RSI ${period}`, data: rsi(closes, period), min: 0, max: 100, color: "#c9a227" })),
        ...uniquePeriods(overlay.adxPeriods).map((period) => ({ name: `ADX ${period}`, data: adx(rows, period), min: 0, max: 100, color: "#7aa2ff" })),
        ...uniquePeriods(overlay.atrPeriods).map((period) => ({ name: `ATR ${period}`, data: atr(rows, period), color: "#f5c542" })),
        ...(overlay.studies ?? []).filter((study) => study.pane === "osc").map((study, index) => ({
          name: study.label,
          data: indicatorLine(rows, study.spec),
          color: EMA_COLORS[index % EMA_COLORS.length],
        })),
      ]
    : [];
  if (strategyOscillators.length) return oscillatorOption(rows, visibleBars, replay, overlay, strategyOscillators);
  const emaPeriods = overlay ? uniquePeriods(overlay.emas ?? [overlay.fastPeriod ?? 0, overlay.slowPeriod ?? 0]) : [];
  const fastLine = overlay?.fastPeriod != null ? ema(closes, overlay.fastPeriod) : [];
  const slowLine = overlay?.slowPeriod != null && overlay.slowPeriod !== overlay.fastPeriod ? ema(closes, overlay.slowPeriod) : [];
  const extraEmas = emaPeriods.filter((period) => period !== overlay?.fastPeriod && period !== overlay?.slowPeriod);
  const priceStudies = (overlay?.studies ?? []).filter((study) => study.pane === "price");
  const marks = [...(replay?.trades ?? []), ...(overlay?.marks ?? [])];
  const legendNames = [
    ...(replay ? ["EMA 5", "EMA 8", "EMA 13"] : []),
    ...(overlay?.fastPeriod != null ? [`EMA ${overlay.fastPeriod}`] : []),
    ...(overlay?.slowPeriod != null && overlay.slowPeriod !== overlay.fastPeriod ? [`EMA ${overlay.slowPeriod}`] : []),
    ...extraEmas.map((period) => `EMA ${period}`),
    ...priceStudies.map((study) => study.label),
  ];
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
    legend: legendNames.length
      ? { show: true, data: legendNames, top: 0, left: 12, textStyle: { color: "#9a9a9a" }, itemHeight: 8 }
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
        if (candle?.dataIndex != null) {
          if (replay) {
            const emaValue = ema5[candle.dataIndex];
            const rsiValue = rsi14[candle.dataIndex];
            if (emaValue != null) lines.push(`EMA 5 ${price(emaValue)}`);
            if (rsiValue != null) lines.push(`RSI ${rsiValue.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`);
          }
          if (overlay) {
            const fastValue = overlay.fastPeriod == null ? null : fastLine[candle.dataIndex];
            const slowValue = overlay.slowPeriod == null ? null : slowLine[candle.dataIndex];
            if (fastValue != null) lines.push(`EMA ${overlay.fastPeriod} ${price(fastValue)}`);
            if (slowValue != null && overlay.slowPeriod !== overlay.fastPeriod) lines.push(`EMA ${overlay.slowPeriod} ${price(slowValue)}`);
            for (const period of extraEmas) {
              const value = ema(closes, period)[candle.dataIndex];
              if (value != null) lines.push(`EMA ${period} ${price(value)}`);
            }
          }
        }
        return lines.join("<br/>");
      },
    },
    grid: lower === "none"
      ? [{ left: 16, right: 96, top: legendNames.length ? 28 : 16, bottom: 52 }]
      : [
          { left: 16, right: 96, top: legendNames.length ? 28 : 16, height: "62%" },
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
        markPoint: marks.length
          ? {
              silent: true,
              animation: false,
              data: marks.flatMap((trade) => {
                const pin = (buy: boolean, index: number, value: number) => ({
                  coord: [index, value],
                  symbol: "circle",
                  symbolSize: trade.showPrice ? 9 : 12,
                  itemStyle: { color: buy ? "#16c47a" : DOWN },
                  label: trade.showPrice
                    ? {
                        show: true,
                        formatter: `${buy ? "AL" : "SAT"} ${price(value)}`,
                        color: buy ? "#042014" : "#ffffff",
                        backgroundColor: buy ? "#16c47a" : DOWN,
                        fontSize: 10,
                        padding: [2, 4],
                        borderRadius: 2,
                        position: buy ? ("bottom" as const) : ("top" as const),
                      }
                    : { show: false },
                });
                const entry = pin(trade.entryBuy, trade.entryIndex, trade.entryPrice);
                if (trade.exitIndex == null || trade.exitPrice == null) return [entry];
                return [entry, pin(trade.exitBuy, trade.exitIndex, trade.exitPrice)];
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
      ...(overlay?.fastPeriod != null ? [line(`EMA ${overlay.fastPeriod}`, fastLine, "#f5c542")] : []),
      ...(overlay?.slowPeriod != null && overlay.slowPeriod !== overlay.fastPeriod ? [line(`EMA ${overlay.slowPeriod}`, slowLine, "#7aa2ff")] : []),
      ...extraEmas.map((period, index) => line(`EMA ${period}`, ema(closes, period), EMA_COLORS[(index + 2) % EMA_COLORS.length])),
      ...priceStudies.map((study, index) => line(study.label, indicatorLine(rows, study.spec), EMA_COLORS[index % EMA_COLORS.length])),
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

type OscillatorPane = { name: string; data: Array<number | null>; min?: number; max?: number; color: string };

function oscillatorOption(
  rows: OhlcBar[],
  visibleBars: number,
  replay: { axisMin: number; axisMax: number; trades?: TradeMark[] } | null,
  overlay: ChartOverlay | null,
  panes: OscillatorPane[],
): EChartsCoreOption {
  const view = windowPercent(rows.length, visibleBars);
  const last = rows[rows.length - 1];
  const labels = rows.map((row) => row.label);
  const closes = rows.map((row) => row.close);
  const lower: OscillatorPane[] = [
    ...(replay ? [{ name: "RSI", data: rsi(closes, 14), min: 0, max: 100, color: "#c9a227" }] : []),
    ...panes,
  ];
  const emaPeriods = uniquePeriods(overlay?.emas ?? [overlay?.fastPeriod ?? 0, overlay?.slowPeriod ?? 0]);
  const drawn = emaPeriods.filter((period, index) => emaPeriods.indexOf(period) === index);
  const marks = [...(replay?.trades ?? []), ...(overlay?.marks ?? [])];
  const legendNames = [
    ...(replay ? ["EMA 5", "EMA 8", "EMA 13"] : []),
    ...drawn.map((period) => `EMA ${period}`),
    ...(overlay?.studies ?? []).filter((study) => study.pane === "price").map((study) => study.label),
    ...panes.map((pane) => pane.name),
  ];
  const paneCount = 1 + lower.length;
  const axes = Array.from({ length: paneCount }, (_, index) => index);
  const top = legendNames.length ? 28 : 16;
  const subHeight = lower.length > 2 ? 9 : 12;
  const priceHeight = Math.max(28, 74 - Math.max(0, lower.length - 1) * 12);
  const grid = [
    { left: 16, right: 96, top, height: `${priceHeight}%` },
    ...lower.map((_, index) => ({
      left: 16,
      right: 96,
      top: `${priceHeight + 6 + index * (subHeight + 2)}%`,
      height: `${subHeight}%`,
    })),
  ];
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
  const emaLines = new Map(drawn.map((period) => [period, ema(closes, period)]));
  return {
    backgroundColor: "#000000",
    animation: false,
    legend: { show: legendNames.length > 0, data: legendNames, top: 0, left: 12, textStyle: { color: "#9a9a9a" }, itemHeight: 8 },
    axisPointer: { link: [{ xAxisIndex: "all" }], label: { backgroundColor: "#222222" } },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#111111",
      borderColor: "#333333",
      textStyle: { color: "#f2f2f2", fontSize: 12 },
      formatter: (params: unknown) => {
        const list = (Array.isArray(params) ? params : [params]) as Array<{ seriesType?: string; dataIndex?: number }>;
        const candle = list.find((item) => item.seriesType === "candlestick");
        const row = candle?.dataIndex == null ? undefined : rows[candle.dataIndex];
        if (!row || candle?.dataIndex == null) return "";
        const lines = [row.time.replace("T", " ").slice(0, 16), `Kapanış ${price(row.close)}`];
        for (const period of drawn) {
          const value = emaLines.get(period)?.[candle.dataIndex];
          if (value != null) lines.push(`EMA ${period} ${price(value)}`);
        }
        for (const pane of lower) {
          const value = pane.data[candle.dataIndex];
          if (value != null) lines.push(`${pane.name} ${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`);
        }
        return lines.join("<br/>");
      },
    },
    grid,
    xAxis: [categoryAxis(0, true), ...lower.map((_, index) => categoryAxis(index + 1, false))],
    yAxis: [
      {
        scale: true,
        position: "right",
        axisLine: { lineStyle: { color: "#333333" } },
        axisLabel: { color: "#d6d6d6", formatter: (value: number) => price(value) },
        splitLine: { lineStyle: { color: "#1c1c1c" } },
        min: (value: { min: number; max: number }) => value.min - (value.max - value.min) * 0.08,
        max: (value: { min: number; max: number }) => value.max + (value.max - value.min) * 0.08,
      },
      ...lower.map((pane, index) => ({
        gridIndex: index + 1,
        position: "right" as const,
        min: pane.min,
        max: pane.max,
        scale: pane.min == null,
        axisLabel: { color: "#9a9a9a" },
        axisLine: { lineStyle: { color: "#333333" } },
        splitLine: { lineStyle: { color: "#1c1c1c" } },
      })),
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: axes,
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
        xAxisIndex: axes,
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
      },
    ],
    series: [
      {
        name: "Fiyat",
        type: "candlestick",
        data: rows.map((row) => [row.open, row.close, row.low, row.high]),
        itemStyle: { color: UP, color0: DOWN, borderColor: UP, borderColor0: DOWN },
        barMaxWidth: replay ? undefined : 12,
        markPoint: marks.length
          ? {
              silent: true,
              animation: false,
              data: marks.flatMap((trade) => {
                const pin = (buy: boolean, index: number, value: number) => ({
                  coord: [index, value],
                  symbol: "circle",
                  symbolSize: trade.showPrice ? 9 : 12,
                  itemStyle: { color: buy ? "#16c47a" : DOWN },
                  label: trade.showPrice
                    ? { show: true, formatter: `${buy ? "AL" : "SAT"} ${price(value)}`, color: buy ? "#042014" : "#ffffff", backgroundColor: buy ? "#16c47a" : DOWN, fontSize: 10, padding: [2, 4], borderRadius: 2, position: buy ? ("bottom" as const) : ("top" as const) }
                    : { show: false },
                });
                const entry = pin(trade.entryBuy, trade.entryIndex, trade.entryPrice);
                if (trade.exitIndex == null || trade.exitPrice == null) return [entry];
                return [entry, pin(trade.exitBuy, trade.exitIndex, trade.exitPrice)];
              }),
            }
          : undefined,
        markLine: last
          ? {
              symbol: "none",
              silent: true,
              animation: false,
              lineStyle: { color: last.close >= last.open ? "#ffffff" : DOWN, type: "dashed", width: 1 },
              label: { show: true, position: "end", formatter: price(last.close), color: last.close >= last.open ? "#111111" : "#ffffff", backgroundColor: last.close >= last.open ? "#ffffff" : DOWN, padding: [3, 5], borderRadius: 2 },
              data: [{ yAxis: last.close }],
            }
          : undefined,
      },
      ...(replay
        ? [line("EMA 5", ema(closes, 5), "#d0d0d0"), line("EMA 8", ema(closes, 8), "#c9a227"), line("EMA 13", ema(closes, 13), "#7aa2ff")]
        : []),
      ...drawn.map((period, index) => line(`EMA ${period}`, emaLines.get(period) ?? [], EMA_COLORS[index % EMA_COLORS.length])),
      ...(overlay?.studies ?? []).filter((study) => study.pane === "price").map((study, index) => line(study.label, indicatorLine(rows, study.spec), EMA_COLORS[index % EMA_COLORS.length])),
      ...lower.map((pane, index) => line(pane.name, pane.data, pane.color, index + 1)),
    ],
  };
}

import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  bollinger,
  ema,
  sma,
  vwap,
} from "@/lib/simulator/indicators";
import type { HistoryCandle, SimPosition } from "@/lib/simulator/types";

export interface ChartIndicatorToggle {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  sma50: boolean;
  bollinger: boolean;
  vwap: boolean;
}

interface Props {
  /** Tüm tarihsel mumlar (gizli olanlar dahil) */
  candles: HistoryCandle[];
  /** Şu anki bar dizini (0..candles.length-1) — bundan sonrası gizli */
  currentBarIdx: number;
  indicators: ChartIndicatorToggle;
  positions: SimPosition[];
}

export function SimChart({ candles, currentBarIdx, indicators, positions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Chart init
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.2)" },
        horzLines: { color: "rgba(51,65,85,0.2)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: false, secondsVisible: false },
      localization: { locale: "tr-TR" },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "rgba(34,197,94,0.4)",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      chart.applyOptions({
        width: Math.floor(r.width),
        height: Math.floor(r.height),
      });
    });
    ro.observe(el);
    chart.applyOptions({
      width: Math.floor(el.clientWidth),
      height: Math.floor(el.clientHeight),
    });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      indicatorRefs.current.clear();
      priceLinesRef.current = [];
    };
  }, []);

  // Visible candles + indikatörler güncelle
  useEffect(() => {
    const chart = chartRef.current;
    const cs = candleRef.current;
    const vs = volumeRef.current;
    if (!chart || !cs || !vs) return;

    const visible = candles.slice(0, currentBarIdx + 1);

    cs.setData(
      visible.map((c) => ({
        time: c.t as UTCTimestamp,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      })) as CandlestickData[],
    );
    vs.setData(
      visible.map((c) => ({
        time: c.t as UTCTimestamp,
        value: c.v,
        color: c.c >= c.o ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
      })),
    );

    // Indicators
    const wantedIndicators: Array<{
      key: string;
      color: string;
      data: LineData[];
    }> = [];

    if (indicators.ema20) {
      const data = ema(visible, 20)
        .filter((p) => p.v != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.v as number }));
      wantedIndicators.push({ key: "ema20", color: "#fbbf24", data });
    }
    if (indicators.ema50) {
      const data = ema(visible, 50)
        .filter((p) => p.v != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.v as number }));
      wantedIndicators.push({ key: "ema50", color: "#3b82f6", data });
    }
    if (indicators.ema200) {
      const data = ema(visible, 200)
        .filter((p) => p.v != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.v as number }));
      wantedIndicators.push({ key: "ema200", color: "#a855f7", data });
    }
    if (indicators.sma50) {
      const data = sma(visible, 50)
        .filter((p) => p.v != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.v as number }));
      wantedIndicators.push({ key: "sma50", color: "#06b6d4", data });
    }
    if (indicators.bollinger) {
      const bb = bollinger(visible, 20, 2);
      const upper = bb
        .filter((p) => p.upper != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.upper as number }));
      const lower = bb
        .filter((p) => p.lower != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.lower as number }));
      wantedIndicators.push({ key: "bb_upper", color: "rgba(168,85,247,0.6)", data: upper });
      wantedIndicators.push({ key: "bb_lower", color: "rgba(168,85,247,0.6)", data: lower });
    }
    if (indicators.vwap) {
      const data = vwap(visible)
        .filter((p) => p.v != null)
        .map<LineData>((p) => ({ time: p.t as UTCTimestamp, value: p.v as number }));
      wantedIndicators.push({ key: "vwap", color: "#f97316", data });
    }

    // Mevcut indicator serilerini güncelle veya ekle
    const wantedKeys = new Set(wantedIndicators.map((w) => w.key));
    const entries = Array.from(indicatorRefs.current.entries());
    for (const [k, s] of entries) {
      if (!wantedKeys.has(k)) {
        try {
          chart.removeSeries(s);
        } catch {
          /* ignore */
        }
        indicatorRefs.current.delete(k);
      }
    }
    for (const w of wantedIndicators) {
      let s = indicatorRefs.current.get(w.key);
      if (!s) {
        s = chart.addLineSeries({
          color: w.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        indicatorRefs.current.set(w.key, s);
      }
      s.setData(w.data);
    }

    // Otomatik scroll → son bara odakla
    chart.timeScale().scrollToRealTime();
  }, [candles, currentBarIdx, indicators]);

  // Açık pozisyonların stop/target çizgilerini güncelle
  useEffect(() => {
    const cs = candleRef.current;
    if (!cs) return;

    // Eski çizgileri temizle
    for (const pl of priceLinesRef.current) {
      try {
        cs.removePriceLine(pl);
      } catch {
        /* ignore */
      }
    }
    priceLinesRef.current = [];

    const open = positions.filter((p) => p.status === "open");
    for (const p of open) {
      const isLong = p.side === "long";
      // Giriş çizgisi
      priceLinesRef.current.push(
        cs.createPriceLine({
          price: p.entryPrice,
          color: "#64748b",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `Giriş ${isLong ? "↑" : "↓"} ${p.entryPrice.toFixed(2)}`,
        }),
      );
      if (p.stopLoss !== undefined) {
        priceLinesRef.current.push(
          cs.createPriceLine({
            price: p.stopLoss,
            color: "#ef4444",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Stop ${p.stopLoss.toFixed(2)}`,
          }),
        );
      }
      if (p.takeProfit !== undefined) {
        priceLinesRef.current.push(
          cs.createPriceLine({
            price: p.takeProfit,
            color: "#22c55e",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Target ${p.takeProfit.toFixed(2)}`,
          }),
        );
      }
    }
  }, [positions]);

  return <div ref={containerRef} className="h-full w-full min-h-[360px]" />;
}

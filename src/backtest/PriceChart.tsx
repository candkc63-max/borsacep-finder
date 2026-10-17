import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import type { Islem, Mum } from "./types";

function yakin(times: number[], hedef: number): number {
  return times.reduce((a, b) => (Math.abs(b - hedef) < Math.abs(a - hedef) ? b : a), times[0]);
}

export function PriceChart({ mumlar, islemler }: { mumlar: Mum[]; islemler: Islem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || mumlar.length === 0) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: "rgba(22,27,34,0.2)" }, textColor: "#8b97a8" },
      grid: { vertLines: { color: "#2b3340" }, horzLines: { color: "#2b3340" } },
      rightPriceScale: { borderColor: "#2b3340" },
      timeScale: { borderColor: "#2b3340" },
      width: ref.current.clientWidth,
      height: 280,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#3d9a6a",
      downColor: "#c45c5c",
      borderVisible: false,
      wickUpColor: "#3d9a6a",
      wickDownColor: "#c45c5c",
    });
    const data = mumlar.map((m) => ({
      time: m.time as never,
      open: m.open,
      high: m.high,
      low: m.low,
      close: m.close,
    }));
    series.setData(data);
    const times = mumlar.map((m) => m.time);
    series.setMarkers(
      islemler.flatMap((t) => {
        const g = yakin(times, Math.floor(new Date(t.giris_zaman).getTime() / 1000));
        const c = yakin(times, Math.floor(new Date(t.cikis_zaman).getTime() / 1000));
        return [
          { time: g as never, position: "belowBar" as const, color: "#3d9a6a", shape: "arrowUp" as const, text: t.yon },
          { time: c as never, position: "aboveBar" as const, color: "#c45c5c", shape: "arrowDown" as const, text: t.neden },
        ];
      }),
    );
    chart.timeScale().fitContent();
    const onResize = () => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [mumlar, islemler]);

  return <div className="chart" ref={ref} />;
}

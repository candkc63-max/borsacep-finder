import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import type { EquityNokta } from "./types";

export function EquityChart({ equity }: { equity: EquityNokta[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || equity.length === 0) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: "rgba(22,27,34,0.2)" }, textColor: "#8b97a8" },
      grid: { vertLines: { color: "#2b3340" }, horzLines: { color: "#2b3340" } },
      rightPriceScale: { borderColor: "#2b3340" },
      timeScale: { borderColor: "#2b3340" },
      width: ref.current.clientWidth,
      height: 220,
    });
    const series = chart.addLineSeries({ color: "#c9a227", lineWidth: 2 });
    series.setData(
      equity
        .filter((e) => e.equity != null)
        .map((e) => ({
          time: Math.floor(new Date(e.time).getTime() / 1000) as never,
          value: e.equity as number,
        })),
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
  }, [equity]);

  return <div className="chart" ref={ref} style={{ height: 220 }} />;
}

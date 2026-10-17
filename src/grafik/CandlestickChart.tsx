import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { candleOption } from "../../chart/lib/candleChart";
import { parseOhlcvCsv, type OhlcBar } from "../../chart/lib/parseOhlcv";

export function CandlestickChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<OhlcBar[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    fetch("/CAPITALCOM_NAS100_60.csv")
      .then((response) => {
        if (!response.ok) throw new Error("CSV alınamadı");
        return response.text();
      })
      .then((text) => {
        if (!cancel) setRows(parseOhlcvCsv(text));
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
    chart.setOption(candleOption(rows));
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [rows]);

  return (
    <div className="h-full w-full bg-black">
      {error && <p className="p-4 text-sm text-bearish">{error}</p>}
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

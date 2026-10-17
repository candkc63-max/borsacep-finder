"use client";

import dynamic from "next/dynamic";

const CandlestickChart = dynamic(
  () => import("@/components/CandlestickChart").then((mod) => mod.CandlestickChart),
  { ssr: false },
);

export default function Page() {
  return (
    <main>
      <p className="tag">Dummy OHLCV · Apache ECharts</p>
      <div className="stage">
        <CandlestickChart />
      </div>
    </main>
  );
}

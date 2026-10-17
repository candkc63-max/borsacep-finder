"use client";

import dynamic from "next/dynamic";

const CandlestickChart = dynamic(
  () => import("@/components/CandlestickChart").then((mod) => mod.CandlestickChart),
  { ssr: false },
);

export default function Page() {
  return (
    <main>
      <p className="tag">CAPITALCOM:NAS100 · 60 dk · 8 Tem–16 Eki 2026</p>
      <div className="stage">
        <CandlestickChart />
      </div>
    </main>
  );
}

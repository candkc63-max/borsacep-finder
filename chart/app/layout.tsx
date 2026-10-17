import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mum grafik",
  description: "Apache ECharts mum grafiği. Veri örnek OHLCV.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

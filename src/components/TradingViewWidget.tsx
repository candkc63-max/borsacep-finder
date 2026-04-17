import { useEffect, useRef, memo } from "react";

interface TradingViewWidgetProps {
  symbol: string; // BIST sembolü, ör: THYAO
  height?: number;
}

function TradingViewWidgetBase({ symbol, height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BIST:${symbol}`,
      interval: "D",
      timezone: "Europe/Istanbul",
      theme: "dark",
      style: "1",
      locale: "tr",
      toolbar_bg: "#0f1115",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
      allow_symbol_change: false,
      details: false,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background" style={{ height }}>
      <div ref={containerRef} className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetBase);

import { useState } from "react";
import type { ChartChoice } from "../../lib/chartSearch";

type IndicatorKey = "ema5" | "ema8" | "ema13" | "rsi";

export function TopBar(props: {
  query: string;
  onQuery: (value: string) => void;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  results: ChartChoice[];
  onPick: (choice: ChartChoice) => void;
  onSearchKey: (key: string) => void;
  choice: ChartChoice;
  intervals: Array<{ label: string; id: string; active: boolean }>;
  onInterval: (id: string) => void;
  chartType: "mum" | "cizgi";
  onChartType: (type: "mum" | "cizgi") => void;
  indicators: Record<IndicatorKey, boolean>;
  onIndicator: (key: IndicatorKey) => void;
  grid: boolean;
  lastPrice: boolean;
  onGrid: () => void;
  onLastPrice: () => void;
  onBars: (bars: number) => void;
  onJump: () => void;
  replayOn: boolean;
  onReplay: () => void;
  onFullscreen: () => void;
  quote: string;
  change: number | null;
}) {
  const [pop, setPop] = useState<null | "type" | "ind" | "set">(null);
  const toggle = (name: "type" | "ind" | "set") => setPop((current) => (current === name ? null : name));

  return (
    <header className="term-top" data-testid="term-top">
      <div className="term-search">
        <input
          value={props.query}
          placeholder="Hisse veya endeks ara"
          aria-label="Hisse veya endeks ara"
          onFocus={() => props.onMenu(true)}
          onChange={(event) => {
            props.onQuery(event.target.value);
            props.onMenu(true);
          }}
          onBlur={() => props.onMenu(false)}
          onKeyDown={(event) => props.onSearchKey(event.key)}
        />
        {props.menuOpen && (
          <div className="term-menu" role="listbox">
            {props.results.length === 0 && <button type="button">Sonuç yok</button>}
            {props.results.map((item) => (
              <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => props.onPick(item)}>
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="term-group" data-testid="timeframes">
        {props.intervals.map((item) => (
          <button key={item.id} type="button" className={item.active ? "term-btn on" : "term-btn"} onClick={() => props.onInterval(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="term-pop-wrap">
        <button type="button" className="term-btn" onClick={() => toggle("type")}>{props.chartType === "mum" ? "Mum" : "Çizgi"}</button>
        {pop === "type" && (
          <div className="term-pop">
            <button type="button" onClick={() => { props.onChartType("mum"); setPop(null); }}>Mum</button>
            <button type="button" onClick={() => { props.onChartType("cizgi"); setPop(null); }}>Çizgi</button>
          </div>
        )}
      </div>
      <div className="term-pop-wrap">
        <button type="button" className="term-btn" onClick={() => toggle("ind")}>İndikatör</button>
        {pop === "ind" && (
          <div className="term-pop">
            <button type="button" onClick={() => props.onIndicator("ema5")}>{props.indicators.ema5 ? "✓ " : ""}EMA 5</button>
            <button type="button" onClick={() => props.onIndicator("ema8")}>{props.indicators.ema8 ? "✓ " : ""}EMA 8</button>
            <button type="button" onClick={() => props.onIndicator("ema13")}>{props.indicators.ema13 ? "✓ " : ""}EMA 13</button>
            <button type="button" onClick={() => props.onIndicator("rsi")}>{props.indicators.rsi ? "✓ " : ""}RSI 14</button>
          </div>
        )}
      </div>
      <button type="button" className={props.replayOn ? "term-btn on" : "term-btn"} onClick={props.onReplay}>Bar Replay</button>
      <button type="button" className="term-btn" onClick={props.onFullscreen}>Tam ekran</button>
      <div className="term-pop-wrap">
        <button type="button" className="term-btn" onClick={() => toggle("set")}>Ayarlar</button>
        {pop === "set" && (
          <div className="term-pop">
            <button type="button" onClick={props.onGrid}>{props.grid ? "✓ " : ""}Izgara</button>
            <button type="button" onClick={props.onLastPrice}>{props.lastPrice ? "✓ " : ""}Son fiyat</button>
            <button type="button" onClick={() => { props.onBars(48); setPop(null); }}>48 mum</button>
            <button type="button" onClick={() => { props.onBars(120); setPop(null); }}>120 mum</button>
            <button type="button" onClick={() => { props.onBars(480); setPop(null); }}>480 mum</button>
            <button type="button" onClick={() => { props.onBars(100000); setPop(null); }}>Tümü</button>
            <button type="button" onClick={() => { props.onJump(); setPop(null); }}>Sona dön</button>
          </div>
        )}
      </div>
      <div className="term-quote" data-testid="quote">{props.quote}{props.change == null ? "" : <span className={props.change < 0 ? "term-down" : "term-up"}> {props.change > 0 ? "+" : ""}{props.change.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</span>}</div>
      <a className="term-link" href="#filtre">Hisse filtreleme</a>
    </header>
  );
}

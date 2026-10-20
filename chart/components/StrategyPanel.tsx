import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { backtestEmaCross, type EmaCrossSpec, type StrategyReport, type StrategyTrade } from "../lib/emaCross";
import type { OhlcBar } from "../lib/parseOhlcv";
import { StrategyBuilder } from "./StrategyBuilder";

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

function percent(value: number | null) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${(value * 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function factor(value: number | null) {
  if (value == null) return "—";
  if (!Number.isFinite(value)) return "Sonsuz";
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tone(value: number | null) {
  if (value == null || value === 0) return "#f2f2f2";
  return value < 0 ? "#e10600" : "#d8ffe8";
}

function EquityLine({ values }: { values: number[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(0, Math.floor(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const height = 88;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const inner = Math.max(1, width - pad * 2);
  const step = values.length > 1 ? inner / (values.length - 1) : 0;
  const points = width > 0
    ? values.map((value, index) => {
        const x = pad + index * step;
        const y = height - pad - ((value - min) / span) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";
  return (
    <div ref={ref} data-testid="equity-curve" style={{ width: "100%", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#8d8d8d", marginBottom: 4 }}>
        <span>Sermaye eğrisi</span>
        <span>{money(min)} – {money(max)}</span>
      </div>
      {width > 0 && values.length > 1 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sermaye eğrisi" style={{ display: "block", maxWidth: "100%" }}>
          <rect x="0" y="0" width={width} height={height} fill="#111" rx="8" />
          <polyline fill="none" stroke="#f5c542" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
      )}
    </div>
  );
}

function Card({ testId, label, value, detail, color }: { testId: string; label: string; value: string; detail: string; color: string }) {
  return (
    <article data-testid={testId} style={{ minWidth: 0, background: "#141414", border: "1px solid #2c2c2c", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ color: "#8d8d8d", fontSize: 10, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ marginTop: 4, color, font: "650 18px/1.15 ui-sans-serif, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ marginTop: 4, color: "#bdbdbd", fontVariantNumeric: "tabular-nums" }}>{detail}</div>
    </article>
  );
}

function tradeCommission(trade: StrategyTrade) {
  return trade.entryCommission + (trade.exitCommission ?? 0);
}

function exitLabel(trade: StrategyTrade) {
  if (trade.exitIndex == null) return "Açık";
  if (trade.exitReason === "stop") return "Stop";
  if (trade.exitReason === "gap-stop") return "Boşluk stop";
  if (trade.exitReason === "target") return "Hedef";
  if (trade.exitReason === "gap-target") return "Boşluk hedef";
  if (trade.exitReason === "signal") return "Sinyal";
  return "—";
}

export function StrategyPanel({
  rows,
  adjustment,
  view,
  replayOn,
  onReport,
  onFocus,
}: {
  rows: OhlcBar[] | null;
  adjustment: string;
  view: StrategyReport | null;
  replayOn: boolean;
  onReport: (report: StrategyReport) => void;
  onFocus: (index: number) => void;
}) {
  const [fast, setFast] = useState("20");
  const [slow, setSlow] = useState("50");
  const [capital, setCapital] = useState("100000");
  const [allocation, setAllocation] = useState("100");
  const [fee, setFee] = useState("0.05");
  const [slippage, setSlippage] = useState("0");
  const [formError, setFormError] = useState("");
  const [mode, setMode] = useState<"ema" | "builder">("ema");
  const [openCycle, setOpenCycle] = useState<number | null>(null);

  function run() {
    if (!rows?.length) {
      setFormError("Grafik verisi yok.");
      return;
    }
    const spec: EmaCrossSpec = {
      fast: Number(fast),
      slow: Number(slow),
      capital: Number(capital),
      allocation: Number(allocation) / 100,
      feeRate: Number(fee) / 100,
      slippageRate: Number(slippage) / 100,
    };
    if (![spec.fast, spec.slow, spec.capital, spec.allocation, spec.feeRate, spec.slippageRate].every(Number.isFinite)) {
      setFormError("Ayarlar sayı olmalı.");
      return;
    }
    setFormError("");
    onReport(backtestEmaCross(rows, spec, adjustment));
  }

  const input = { background: "#111", color: "#f2f2f2", border: "1px solid #3a3a3a", borderRadius: 8, minHeight: 32, padding: "0 8px", width: 88 };

  const modeButton = (active: boolean): CSSProperties => ({
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #3a3a3a",
    background: active ? "#f2f2f2" : "#161616",
    color: active ? "#111" : "#f2f2f2",
    cursor: "pointer",
  });

  return (
    <div data-testid="strategy-panel" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" data-testid="strategy-mode-ema" onClick={() => setMode("ema")} style={modeButton(mode === "ema")}>Hazır EMA</button>
        <button type="button" data-testid="strategy-mode-builder" onClick={() => setMode("builder")} style={modeButton(mode === "builder")}>Yeni Strateji Oluştur</button>
      </div>
      {mode === "builder" && <StrategyBuilder rows={rows} adjustment={adjustment} onReport={onReport} />}
      {mode === "ema" && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label>Hızlı EMA<input value={fast} onChange={(event) => setFast(event.target.value)} style={input} /></label>
        <label>Yavaş EMA<input value={slow} onChange={(event) => setSlow(event.target.value)} style={input} /></label>
        <label>Yön<select value="long" disabled style={input}><option value="long">Only Long</option></select></label>
        <label>Sermaye<input value={capital} onChange={(event) => setCapital(event.target.value)} style={input} /></label>
        <label>Büyüklük %<input value={allocation} onChange={(event) => setAllocation(event.target.value)} style={input} /></label>
        <label>Komisyon %<input value={fee} onChange={(event) => setFee(event.target.value)} style={input} /></label>
        <label>Kayma %<input value={slippage} onChange={(event) => setSlippage(event.target.value)} style={input} /></label>
        <button type="button" data-testid="strategy-run" onClick={run} disabled={!rows?.length} style={{ minHeight: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #f2f2f2", background: "#f2f2f2", color: "#111", cursor: "pointer" }}>Testi Başlat</button>
      </div>
      )}
      {mode === "ema" && <p style={{ margin: 0, color: "#9a9a9a" }}>Strateji Sınayıcı. AL: hızlı EMA yavaş EMA'yı yukarı kesince sonraki açılış. SAT: aşağı kesince sonraki açılış. Short yok. Kesirli adet yok. Son mumdaki sinyal emir sayılmaz.</p>}
      {formError && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{formError}</p>}
      {view && !view.ok && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{view.error}</p>}
      {view?.ok && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ color: "#9a9a9a" }}>{view.from} → {view.to} · {view.bars} mum{replayOn ? " · replay görünümü" : ""}</div>
          <div style={{ color: "#9a9a9a" }}>{view.adjustment}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 8 }}>
            <Card testId="metric-return" label="NET GETİRİ" value={percent(view.totalReturn)} detail={signed(view.realized)} color={tone(view.totalReturn)} />
            <Card testId="metric-drawdown" label="MAKSİMUM DÜŞÜŞ" value={view.maxDrawdownPercent ? percent(-view.maxDrawdownPercent) : "0,00%"} detail={money(view.maxDrawdown)} color="#e10600" />
            <Card testId="metric-factor" label="PROFIT FACTOR" value={factor(view.profitFactor)} detail={`${view.wins} kazanç · ${view.losses} kayıp`} color="#f2f2f2" />
            <Card testId="metric-win" label="BAŞARI ORANI" value={view.winRate == null ? "—" : `${(view.winRate * 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}%`} detail={view.completed ? `${view.wins} / ${view.completed}` : "Kapanan işlem yok"} color="#f2f2f2" />
            <Card testId="metric-trades" label="İŞLEM SAYISI" value={String(view.completed)} detail={view.openShares ? `${view.openShares} adet açık` : "Açık pozisyon yok"} color="#f2f2f2" />
            <Card testId="metric-fee" label="TOPLAM KOMİSYON" value={money(view.totalCommission)} detail="Alış ve satış" color="#f2f2f2" />
          </div>
          <EquityLine values={view.equity} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 8 }}>
            <Card testId="metric-capital" label="BAŞLANGIÇ" value={money(view.startingCapital)} detail="Test sermayesi" color="#f2f2f2" />
            <Card testId="metric-portfolio" label="PORTFÖY" value={money(view.portfolio)} detail={signed(view.unrealized) + " açık k/z"} color={tone(view.portfolio - view.startingCapital)} />
            <Card testId="metric-hold" label="AL VE TUT" value={percent(view.buyHold?.totalReturn ?? null)} detail={view.buyHold ? `Portföy ${money(view.buyHold.portfolio)}` : "—"} color={tone(view.buyHold?.totalReturn ?? null)} />
            <Card testId="metric-rr" label="ORTALAMA RİSK/ÖDÜL" value={view.avgRewardRisk == null ? "—" : view.avgRewardRisk.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} detail="Başlangıç stopuna göre" color="#f2f2f2" />
            <Card testId="metric-stop-exits" label="STOP ÇIKIŞI" value={String(view.stopExits)} detail="Stop ve boşluk stop" color="#e10600" />
            <Card testId="metric-target-exits" label="HEDEF ÇIKIŞI" value={String(view.targetExits)} detail="Hedef ve boşluk hedef" color="#16c47a" />
            <Card testId="metric-avg-win" label="ORTALAMA KAZANÇ" value={view.avgWin == null ? "—" : signed(view.avgWin)} detail="Kapanan kazançlar" color="#d8ffe8" />
            <Card testId="metric-avg-loss" label="ORTALAMA KAYIP" value={view.avgLoss == null ? "—" : signed(view.avgLoss)} detail="Kapanan kayıplar" color="#e10600" />
            <Card testId="metric-streak" label="MAKS. ARDIŞIK KAYIP" value={String(view.maxConsecutiveLosses)} detail="Üst üste net kayıp" color="#f2f2f2" />
            <Card testId="metric-slippage" label="KAYMA MALİYETİ" value={money(view.totalSlippage)} detail="Alış ve satış kayması" color="#f2f2f2" />
            <Card testId="metric-max-size" label="MAKS. POZİSYON" value={String(view.maxPosition)} detail="Döngüdeki en yüksek adet" color="#f2f2f2" />
            <Card testId="metric-max-risk" label="MAKS. AÇIK RİSK" value={money(view.maxOpenRisk)} detail="Stopa kadar açık risk" color="#f2f2f2" />
          </div>
          {view.pending && <div style={{ color: "#f5c542" }}>{view.pending.side === "buy" ? "AL" : "SAT"} sinyali son mumda. Emir gerçekleşmedi.</div>}
          <div style={{ overflowX: "auto", border: "1px solid #2c2c2c", borderRadius: 10 }} data-testid="trade-table">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ color: "#8d8d8d", textAlign: "left" }}>
                  {["#", "Alış", "Alış fiyatı", "Adet", "Satış", "Satış fiyatı", "Net", "Komisyon", "Çıkış"].map((heading) => (
                    <th key={heading} style={{ position: "sticky", top: 0, background: "#161616", padding: "7px 8px", fontWeight: 600 }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.trades.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: "10px 8px", color: "#9a9a9a" }}>Gerçekleşen emir yok.</td></tr>
                )}
                {rows && view.trades.map((trade, index) => {
                  const open = trade.exitIndex == null || trade.exitPrice == null;
                  const legs = trade.legs;
                  const expanded = openCycle === index && legs;
                  return (
                    <Fragment key={`${trade.entryIndex}-${trade.exitIndex ?? "open"}`}>
                      <tr onClick={() => onFocus(trade.entryIndex)} style={{ cursor: "pointer", borderTop: "1px solid #242424" }}>
                        <td style={{ padding: "7px 8px" }}>
                          {index + 1}
                          {legs && (
                            <button type="button" data-testid="scale-toggle" onClick={(event) => { event.stopPropagation(); setOpenCycle(expanded ? null : index); }} style={{ marginLeft: 6, background: "transparent", color: "#f5c542", border: 0, cursor: "pointer" }}>{expanded ? "Kapat" : "Kademeler"}</button>
                          )}
                        </td>
                        <td style={{ padding: "7px 8px", color: "#16c47a" }}>{rows[trade.entryIndex]?.label}</td>
                        <td style={{ padding: "7px 8px" }}>{money(trade.entryPrice)}</td>
                        <td style={{ padding: "7px 8px" }}>{open ? trade.shares : (trade.maxShares ?? trade.shares)}</td>
                        <td style={{ padding: "7px 8px", color: open ? "#9a9a9a" : "#e10600" }}>{open ? "Açık" : rows[trade.exitIndex ?? 0]?.label}</td>
                        <td style={{ padding: "7px 8px" }}>{open ? "—" : money(trade.exitPrice ?? 0)}</td>
                        <td style={{ padding: "7px 8px", color: open ? "#f5c542" : tone(trade.realized) }}>{open ? (trade.booked ? signed(trade.booked) : "Açık") : signed(trade.realized ?? 0)}</td>
                        <td style={{ padding: "7px 8px" }}>{money(tradeCommission(trade))}</td>
                        <td style={{ padding: "7px 8px" }}>{exitLabel(trade)}</td>
                      </tr>
                      {expanded && legs && (
                        <tr key={`${trade.entryIndex}-legs`} data-testid="scale-legs">
                          <td colSpan={9} style={{ padding: "6px 8px 10px", color: "#cfcfcf", background: "#101010" }}>
                            <div>Ortalama maliyet {money(trade.entryPrice)} · En yüksek adet {trade.maxShares ?? trade.shares} · Açık risk {money(trade.maxRisk ?? 0)}</div>
                            {legs.entries.map((leg) => (
                              <div key={`e-${leg.seq}`}>{leg.reason === "entry" ? "Giriş" : `Giriş ${leg.seq}`} · {rows[leg.index]?.label} · {leg.shares} adet · {money(leg.price)} · komisyon {money(leg.commission)}</div>
                            ))}
                            {legs.exits.map((leg) => (
                              <div key={`x-${leg.seq}`}>Satış · {rows[leg.index]?.label} · {leg.shares} adet · {money(leg.price)} · komisyon {money(leg.commission)}</div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

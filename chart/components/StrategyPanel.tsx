import { useState } from "react";
import { backtestEmaCross, type EmaCrossSpec, type StrategyReport } from "../lib/emaCross";
import type { OhlcBar } from "../lib/parseOhlcv";

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

function count(value: number | null) {
  if (value == null) return "—";
  if (!Number.isFinite(value)) return "Sonsuz";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function EquityLine({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 320;
  const height = 72;
  const span = max - min || 1;
  const step = (width - 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="72" role="img" aria-label="Sermaye eğrisi">
      <polyline fill="none" stroke="#f5c542" strokeWidth="1.5" points={points} />
    </svg>
  );
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

  return (
    <div data-testid="strategy-panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      <p style={{ margin: 0, color: "#9a9a9a" }}>Strateji Sınayıcı. AL: hızlı EMA yavaş EMA'yı yukarı kesince sonraki açılış. SAT: aşağı kesince sonraki açılış. Short yok. Kesirli adet yok. Son mumdaki sinyal emir sayılmaz.</p>
      {formError && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{formError}</p>}
      {view && !view.ok && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{view.error}</p>}
      {view?.ok && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#9a9a9a" }}>{view.from} → {view.to} · {view.bars} mum{replayOn ? " · replay görünümü" : ""}</div>
          <div style={{ color: "#9a9a9a" }}>{view.adjustment}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span>Başlangıç <b>{money(view.startingCapital)}</b></span>
            <span>Portföy <b>{money(view.portfolio)}</b></span>
            <span>Gerçekleşen <b style={{ color: view.realized < 0 ? "#e10600" : "#f2f2f2" }}>{signed(view.realized)}</b></span>
            <span>Getiri <b>{percent(view.totalReturn)}</b></span>
            <span>Açık k/z <b>{signed(view.unrealized)}</b></span>
            <span>Maks. düşüş <b>{money(view.maxDrawdown)}</b> ({view.maxDrawdownPercent ? percent(-view.maxDrawdownPercent) : "0,00%"})</span>
            <span>İşlem <b>{view.completed}</b></span>
            <span>Kazanan <b>{view.wins}</b> Kaybeden <b>{view.losses}</b></span>
            <span>Başarı <b>{view.winRate == null ? "—" : `${(view.winRate * 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}%`}</b></span>
            <span>Profit factor <b>{count(view.profitFactor)}</b></span>
            <span>Komisyon <b>{money(view.totalCommission)}</b></span>
            {view.buyHold && <span>Al ve tut <b>{percent(view.buyHold.totalReturn)}</b> · portföy {money(view.buyHold.portfolio)}</span>}
          </div>
          {view.pending && <div style={{ color: "#f5c542" }}>{view.pending.side === "buy" ? "AL" : "SAT"} sinyali son mumda. Emir gerçekleşmedi.</div>}
          <EquityLine values={view.equity} />
          <div>
            {view.trades.length === 0 && <span style={{ color: "#9a9a9a" }}>Gerçekleşen emir yok.</span>}
            {rows && view.trades.map((trade) => (
              <button key={`${trade.entryIndex}-${trade.exitIndex ?? "open"}`} type="button" onClick={() => onFocus(trade.entryIndex)} style={{ display: "block", width: "100%", textAlign: "left", marginTop: 6, padding: "6px 8px", background: "#111", color: "#f2f2f2", border: "1px solid #2c2c2c", borderRadius: 4, cursor: "pointer" }}>
                <span style={{ color: "#16c47a" }}>AL</span> {rows[trade.entryIndex]?.label} {money(trade.entryPrice)} · {trade.shares} adet
                {trade.exitIndex == null || trade.exitPrice == null
                  ? " · açık"
                  : <> · <span style={{ color: "#e10600" }}>SAT</span> {rows[trade.exitIndex]?.label} {money(trade.exitPrice)} · {signed(trade.realized ?? 0)}</>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

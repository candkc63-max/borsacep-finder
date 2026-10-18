import type { StrategyReport, StrategyTrade } from "../../lib/strategyBacktest";

export type BuilderFields = {
  fast: string;
  slow: string;
  mode: "long" | "both";
  stopKind: "fixed" | "atr";
  fixedPercent: string;
  atrPeriod: string;
  atrMultiple: string;
  capital: string;
  size: string;
  fee: string;
  slippage: string;
};

export function StrategyBuilder(props: {
  fields: BuilderFields;
  onChange: (patch: Partial<BuilderFields>) => void;
  onRun: () => void;
  report: StrategyReport | null;
  rows: Array<{ time: string }> | null;
  onPick: (trade: StrategyTrade) => void;
}) {
  const set = (key: keyof BuilderFields) => (event: { target: { value: string } }) => props.onChange({ [key]: event.target.value });
  const report = props.report;
  const curve = report?.equity ?? [];
  const low = curve.length ? Math.min(...curve) : 0;
  const high = curve.length ? Math.max(...curve) : 1;
  const span = high - low || 1;
  const path = curve.map((value, index) => {
    const x = curve.length === 1 ? 0 : (index / (curve.length - 1)) * 280;
    const y = 56 - ((value - low) / span) * 56;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div data-testid="strategy-builder">
      <p className="term-note">Bu sürüm EMA kesişimini, sabit yüzde stopu ve ATR stopu dener. Sinyal kapanışta oluşur. Giriş sonraki mumun açılışına kayma eklenerek yapılır. Stop, giriş mumu dahil izlenir.</p>
      <div className="term-row">
        <label className="term-label">Hızlı EMA<input className="term-field" value={props.fields.fast} onChange={set("fast")} /></label>
        <label className="term-label">Yavaş EMA<input className="term-field" value={props.fields.slow} onChange={set("slow")} /></label>
        <label className="term-label">Yön
          <select className="term-select" value={props.fields.mode} onChange={set("mode")}>
            <option value="long">Yalnız long</option>
            <option value="both">Long ve short</option>
          </select>
        </label>
        <label className="term-label">Stop
          <select className="term-select" value={props.fields.stopKind} onChange={set("stopKind")}>
            <option value="fixed">Sabit yüzde</option>
            <option value="atr">ATR</option>
          </select>
        </label>
        {props.fields.stopKind === "fixed" ? (
          <label className="term-label">Stop %<input className="term-field" value={props.fields.fixedPercent} onChange={set("fixedPercent")} /></label>
        ) : (
          <>
            <label className="term-label">ATR periyodu<input className="term-field" value={props.fields.atrPeriod} onChange={set("atrPeriod")} /></label>
            <label className="term-label">ATR katsayı<input className="term-field" value={props.fields.atrMultiple} onChange={set("atrMultiple")} /></label>
          </>
        )}
        <label className="term-label">Sermaye<input className="term-field" value={props.fields.capital} onChange={set("capital")} /></label>
        <label className="term-label">Büyüklük<input className="term-field" value={props.fields.size} onChange={set("size")} /></label>
        <label className="term-label">Komisyon %<input className="term-field" value={props.fields.fee} onChange={set("fee")} /></label>
        <label className="term-label">Kayma %<input className="term-field" value={props.fields.slippage} onChange={set("slippage")} /></label>
        <button type="button" className="term-btn term-buy" onClick={props.onRun}>Testi Başlat</button>
      </div>
      {report?.error && <p className="term-down">{report.error}</p>}
      {report && !report.error && (
        <>
          <div className="term-stats" style={{ marginTop: 10 }}>
            <div className="term-stat"><span>Net getiri</span><b>{pct(report.netReturn)}</b></div>
            <div className="term-stat"><span>Maks. düşüş</span><b>{money(report.maxDrawdown)}</b></div>
            <div className="term-stat"><span>Başarı oranı</span><b>{pct(report.winRate)}</b></div>
            <div className="term-stat"><span>Profit Factor</span><b>{report.profitFactor == null ? "—" : report.profitFactor.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</b></div>
            <div className="term-stat"><span>İşlem sayısı</span><b>{report.tradeCount}</b></div>
            <div className="term-stat"><span>Gerçekleşen</span><b>{money(report.realized)}</b></div>
          </div>
          {curve.length > 1 && (
            <svg data-testid="equity-curve" viewBox="0 0 280 56" width="100%" height="56" role="img" aria-label="Sermaye eğrisi" style={{ marginTop: 8 }}>
              <path d={path} fill="none" stroke="#f2f2f2" strokeWidth="1.4" />
            </svg>
          )}
          <table className="term-table">
            <thead>
              <tr><th>Giriş</th><th>Yön</th><th>Fiyat</th><th>Çıkış</th><th>Sonuç</th></tr>
            </thead>
            <tbody>
              {report.trades.slice(0, 40).map((trade) => (
                <tr key={trade.id}>
                  <td><button type="button" className="term-btn" onClick={() => props.onPick(trade)}>{stamp(props.rows?.[trade.entryIndex]?.time)}</button></td>
                  <td>{trade.direction === "long" ? "AL" : "SAT"}</td>
                  <td>{num(trade.entry)}</td>
                  <td>{trade.exit == null ? "açık" : num(trade.exit)}</td>
                  <td className={(trade.net ?? 0) < 0 ? "term-down" : "term-up"}>{trade.net == null ? "—" : money(trade.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.trades.length === 0 && <p className="term-note">Bu veride kesişim oluşmadı.</p>}
        </>
      )}
    </div>
  );
}

function num(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number | null) {
  if (value == null) return "—";
  return `%${(value * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

function stamp(time: string | undefined) {
  if (!time) return "—";
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
}

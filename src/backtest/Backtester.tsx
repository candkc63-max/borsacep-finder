import { useEffect, useState } from "react";
import { EquityChart } from "./EquityChart";
import { PriceChart } from "./PriceChart";
import type { OptSatir, Sonuc } from "./types";
import "./backtester.css";

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function num(v: number | null | undefined, d = 2) {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR", { maximumFractionDigits: d });
}

export function Backtester() {
  const [yamlText, setYamlText] = useState("");
  const [sermaye, setSermaye] = useState("100000");
  const [risk, setRisk] = useState("1");
  const [kaynak, setKaynak] = useState<"sentetik" | "yahoo" | "csv">("sentetik");
  const [sembol, setSembol] = useState("AAPL");
  const [periyot, setPeriyot] = useState("1d");
  const [csvText, setCsvText] = useState("");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [opt, setOpt] = useState<OptSatir[] | null>(null);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    fetch("/api/ornek-yaml")
      .then((r) => r.json())
      .then((d) => setYamlText(d.yaml_text ?? ""))
      .catch(() => setHata("Örnek strateji alınamadı."));
  }, []);

  function govde() {
    return {
      yaml_text: yamlText,
      sermaye: Number(sermaye),
      risk_percent: Number(risk),
      sentetik: kaynak === "sentetik",
      sembol: kaynak === "yahoo" ? sembol : null,
      periyot,
      csv_text: kaynak === "csv" ? csvText : null,
    };
  }

  async function kos() {
    setHata("");
    setYukleniyor(true);
    setOpt(null);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde()),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "backtest hata");
      setSonuc(d);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "hata");
    } finally {
      setYukleniyor(false);
    }
  }

  async function optimizeEt() {
    setHata("");
    setYukleniyor(true);
    try {
      const r = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...govde(),
          grid: { "stop.deger": [1.5, 2, 2.5, 3] },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "optimize hata");
      setOpt(d.sonuclar);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "hata");
    } finally {
      setYukleniyor(false);
    }
  }

  const m = sonuc?.metrik;

  return (
    <div className="tc">
      <header>
        <h1>Trading Can Backtester</h1>
        <p>MQL yok. Sinyal kapanışta, dolum sonraki açılışta. Lot otomatik: sermaye × risk / stop mesafesi.</p>
      </header>
      <div className="grid">
        <div className="col">
          <label>Veri</label>
          <select value={kaynak} onChange={(e) => setKaynak(e.target.value as typeof kaynak)}>
            <option value="sentetik">Sentetik (motor denemesi)</option>
            <option value="yahoo">Yahoo gecikmeli (AAPL, THYAO, EURUSD)</option>
            <option value="csv">MT5 CSV yapıştır</option>
          </select>
          {kaynak === "yahoo" && (
            <div className="row">
              <div>
                <label>Sembol</label>
                <input value={sembol} onChange={(e) => setSembol(e.target.value)} />
              </div>
              <div>
                <label>Periyot</label>
                <select value={periyot} onChange={(e) => setPeriyot(e.target.value)}>
                  <option value="1h">1H</option>
                  <option value="4h">4H</option>
                  <option value="1d">Günlük</option>
                </select>
              </div>
            </div>
          )}
          {kaynak === "csv" && (
            <>
              <label>CSV</label>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            </>
          )}
          <div className="row">
            <div>
              <label>Başlangıç sermayesi</label>
              <input value={sermaye} onChange={(e) => setSermaye(e.target.value)} />
            </div>
            <div>
              <label>Risk % / işlem</label>
              <input value={risk} onChange={(e) => setRisk(e.target.value)} />
            </div>
          </div>
          <label>Strateji (YAML)</label>
          <textarea value={yamlText} onChange={(e) => setYamlText(e.target.value)} />
          <button className="primary" onClick={kos} disabled={yukleniyor}>
            {yukleniyor ? "Çalışıyor…" : "Backtest çalıştır"}
          </button>
          <button className="ghost" onClick={optimizeEt} disabled={yukleniyor}>
            Stop ATR ızgarası (1.5–3)
          </button>
          {hata && <div className="err">{hata}</div>}
        </div>
        <div className="col">
          {sonuc ? (
            <>
              <PriceChart mumlar={sonuc.mumlar} islemler={sonuc.islemler} />
              <EquityChart equity={sonuc.equity} />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Yön</th>
                      <th>Giriş</th>
                      <th>Çıkış</th>
                      <th>PnL</th>
                      <th>R</th>
                      <th>Neden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonuc.islemler.slice(0, 80).map((t, i) => (
                      <tr key={i}>
                        <td>{t.yon}</td>
                        <td>{num(t.giris)}</td>
                        <td>{num(t.cikis)}</td>
                        <td className={(t.pnl ?? 0) >= 0 ? "pos" : "neg"}>{num(t.pnl)}</td>
                        <td>{num(t.r)}</td>
                        <td>{t.neden}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="warn">{sonuc.uyari}</p>
            </>
          ) : (
            <p className="warn">Soldan çalıştır. İlk koşu sentetik veriyle motoru gösterir; gerçek piyasa değildir.</p>
          )}
        </div>
        <div className="col">
          {m && (
            <div className="metrics">
              <div className="metric">
                <span>Net PnL</span>
                <b className={(m.net_pnl ?? 0) >= 0 ? "pos" : "neg"}>{num(m.net_pnl)}</b>
              </div>
              <div className="metric">
                <span>CAGR</span>
                <b>{pct(m.cagr)}</b>
              </div>
              <div className="metric">
                <span>Max drawdown</span>
                <b>{pct(m.max_drawdown)}</b>
              </div>
              <div className="metric">
                <span>Profit factor</span>
                <b>{num(m.profit_factor)}</b>
              </div>
              <div className="metric">
                <span>Win rate</span>
                <b>{pct(m.kazanma_orani)}</b>
              </div>
              <div className="metric">
                <span>Ortalama R</span>
                <b>{num(m.ortalama_r)}</b>
              </div>
              <div className="metric">
                <span>Sharpe (günlük)</span>
                <b>{num(m.sharpe)}</b>
              </div>
              <div className="metric">
                <span>İşlem</span>
                <b>{num(m.islem_sayisi, 0)}</b>
              </div>
              <div className="metric">
                <span>Long PnL</span>
                <b>{num(m.uzun_pnl)}</b>
              </div>
              <div className="metric">
                <span>Short PnL</span>
                <b>{num(m.kisa_pnl)}</b>
              </div>
            </div>
          )}
          {sonuc && sonuc.aylik.length > 0 && (
            <>
              <label>Aylık</label>
              <div className="table-wrap" style={{ maxHeight: 160 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Ay</th>
                      <th>Getiri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonuc.aylik.map((a) => (
                      <tr key={a.donem}>
                        <td>{a.donem}</td>
                        <td className={a.getiri >= 0 ? "pos" : "neg"}>{pct(a.getiri)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {opt && (
            <>
              <label>Izgara (stop ATR)</label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Stop</th>
                      <th>PnL</th>
                      <th>DD</th>
                      <th>PF</th>
                      <th>n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opt.map((o, i) => (
                      <tr key={i}>
                        <td>{o.parametre["stop.deger"]}</td>
                        <td>{num(o.net_pnl)}</td>
                        <td>{pct(o.max_drawdown)}</td>
                        <td>{num(o.profit_factor)}</td>
                        <td>{num(o.islem_sayisi, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

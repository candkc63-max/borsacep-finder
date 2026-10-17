import { useEffect, useMemo, useState } from "react";
import type { Bar, BarInterval, BarRange } from "@/data/bars";
import { closePosition, openPosition, openTrade, realizedPnl, scrubTrades, unrealizedPnl, type ReplayTrade, type Side } from "./book";
import { ReplayChart } from "./ReplayChart";

const speeds = [
  { label: "Yavaş", ms: 1000 },
  { label: "Normal", ms: 400 },
  { label: "Hızlı", ms: 150 },
];

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function when(time: number) {
  return new Date(time * 1000).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export function BarReplay() {
  const [symbol, setSymbol] = useState("THYAO");
  const [bist, setBist] = useState(true);
  const [interval, setIntervalValue] = useState<BarInterval>("1d");
  const [range, setRange] = useState<BarRange>("2y");
  const [bars, setBars] = useState<Bar[]>([]);
  const [loadedSymbol, setLoadedSymbol] = useState("");
  const [cursor, setCursor] = useState(0);
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(400);
  const [qty, setQty] = useState("1");
  const [trades, setTrades] = useState<ReplayTrade[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const visible = bars.slice(0, cursor + 1);
  const bar = bars[cursor];
  const position = openTrade(trades);
  const realized = useMemo(() => realizedPnl(trades), [trades]);
  const unrealized = bar ? unrealizedPnl(trades, bar.close) : 0;

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= bars.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, bars.length]);

  function moveCursor(next: number) {
    const clamped = Math.max(0, Math.min(bars.length - 1, next));
    setCursor(clamped);
    setTrades((current) => scrubTrades(current, clamped));
  }

  async function load() {
    setPlaying(false);
    setLoading(true);
    setError("");
    setTrades([]);
    try {
      const params = new URLSearchParams({ symbol, interval, range, bist: bist ? "1" : "0" });
      const response = await fetch(`/api/bars?${params}`);
      const body = await response.json() as { bars?: Bar[]; symbol?: string; error?: string };
      if (!response.ok || !body.bars?.length) throw new Error(body.error || "Mum alınamadı");
      const begin = Math.max(20, Math.floor(body.bars.length * 0.45));
      setBars(body.bars);
      setLoadedSymbol(body.symbol ?? symbol);
      setStart(begin);
      setCursor(begin);
    } catch (reason) {
      setBars([]);
      setError(reason instanceof Error ? reason.message : "Mum alınamadı");
    } finally {
      setLoading(false);
    }
  }

  function deal(side: Side) {
    if (!bar) return;
    const size = Number(qty.replace(",", "."));
    setTrades((current) => openPosition(current, side, cursor, bar.close, size));
  }

  function flatten() {
    if (!bar) return;
    setTrades((current) => closePosition(current, cursor, bar.close));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-foreground md:px-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bar replay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Yahoo gecikmeli mum. Oynatılmayan mumlar gizli. Emir bu mumun kapanışından dolar. Simülasyondur.
          </p>
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Sembol</span>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 font-mono text-sm outline-none" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">Periyot</span>
            <select value={interval} onChange={(event) => setIntervalValue(event.target.value as BarInterval)} className="h-10 w-full rounded-lg border border-border bg-background/70 px-2 text-sm">
              <option value="1d">Günlük</option>
              <option value="1h">1 saat</option>
              <option value="1wk">Haftalık</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">Aralık</span>
            <select value={range} onChange={(event) => setRange(event.target.value as BarRange)} className="h-10 w-full rounded-lg border border-border bg-background/70 px-2 text-sm">
              <option value="6mo">6 ay</option>
              <option value="1y">1 yıl</option>
              <option value="2y">2 yıl</option>
              <option value="5y">5 yıl</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={bist} onChange={(event) => setBist(event.target.checked)} />
            BIST
          </label>
          <div className="flex items-end">
            <button type="button" onClick={load} disabled={loading} className="h-10 w-full rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {loading ? "Yükleniyor" : "Mumları getir"}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-bearish">{error}</p>}
      </section>

      {bar && (
        <>
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm">
              <span className="font-mono">{loadedSymbol}</span>
              <span>{when(bar.time)}</span>
              <span className="font-mono">O {money(bar.open)} H {money(bar.high)} L {money(bar.low)} C {money(bar.close)}</span>
              <span className="text-muted-foreground">{cursor + 1} / {bars.length} mum</span>
            </div>
            <ReplayChart bars={visible} trades={trades} />
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <input
              type="range"
              min={0}
              max={bars.length - 1}
              value={cursor}
              onChange={(event) => {
                setPlaying(false);
                moveCursor(Number(event.target.value));
              }}
              className="w-full"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setPlaying((value) => !value)}>
                {playing ? "Duraklat" : "Oynat"}
              </button>
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => { setPlaying(false); moveCursor(cursor - 1); }}>Önceki mum</button>
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => { setPlaying(false); moveCursor(cursor + 1); }}>Sonraki mum</button>
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => { setPlaying(false); setTrades([]); moveCursor(start); }}>Başa al</button>
              {speeds.map((item) => (
                <button key={item.ms} type="button" className={`rounded-lg border px-3 py-2 text-sm ${speed === item.ms ? "border-primary text-foreground" : "border-border text-muted-foreground"}`} onClick={() => setSpeed(item.ms)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Adet</span>
                <input value={qty} onChange={(event) => setQty(event.target.value)} className="h-10 w-28 rounded-lg border border-border bg-background/70 px-3 font-mono text-sm" />
              </label>
              <button type="button" disabled={!!position} onClick={() => deal("long")} className="h-10 rounded-lg bg-bullish px-3 text-sm font-semibold text-white disabled:opacity-40">Long aç</button>
              <button type="button" disabled={!!position} onClick={() => deal("short")} className="h-10 rounded-lg bg-bearish px-3 text-sm font-semibold text-white disabled:opacity-40">Short aç</button>
              <button type="button" disabled={!position} onClick={flatten} className="h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">Pozisyonu kapat</button>
              <p className="pb-2 text-sm">
                Gerçekleşen <span className="font-mono">{money(realized)}</span>
                {" · "}
                Açık <span className="font-mono">{money(unrealized)}</span>
                {position && <span> · {position.side === "long" ? "Long" : "Short"} {position.qty} @ {money(position.entryPrice)}</span>}
              </p>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Yön</th>
                  <th className="p-3 text-right">Giriş</th>
                  <th className="p-3 text-right">Çıkış</th>
                  <th className="p-3 text-right">Adet</th>
                  <th className="p-3 text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Henüz işlem yok. Mum açılınca long veya short aç.</td></tr>
                )}
                {trades.map((trade) => {
                  const pnl = tradePnlSafe(trade, bar.close);
                  return (
                    <tr key={trade.id} className="border-b border-border/50">
                      <td className="p-3">{trade.side === "long" ? "Long" : "Short"}{trade.exitIndex == null ? " · açık" : ""}</td>
                      <td className="p-3 text-right font-mono">{money(trade.entryPrice)}</td>
                      <td className="p-3 text-right font-mono">{trade.exitPrice == null ? "—" : money(trade.exitPrice)}</td>
                      <td className="p-3 text-right font-mono">{trade.qty}</td>
                      <td className={`p-3 text-right font-mono ${pnl < 0 ? "text-bearish" : "text-bullish"}`}>{money(pnl)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function tradePnlSafe(trade: ReplayTrade, mark: number) {
  const exit = trade.exitPrice ?? mark;
  const diff = trade.side === "long" ? exit - trade.entryPrice : trade.entryPrice - exit;
  return diff * trade.qty;
}

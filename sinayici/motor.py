"""Sinyal t kapanışında; dolum t+1 açılış. Lookahead yok."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from sinayici.strateji import Strateji, gostergeleri_ekle, kurallari_vele


@dataclass
class Islem:
    yon: str
    giris_zaman: object
    cikis_zaman: object
    giris: float
    cikis: float
    adet: float
    pnl: float
    neden: str
    risk_para: float = 0.0


@dataclass
class Sonuc:
    equity: pd.DataFrame
    islemler: list[Islem]
    metrik: dict[str, float]


def _komisyon(fiyat: float, adet: float, oran: float) -> float:
    return abs(adet) * fiyat * oran


def _adet(
    equity: float,
    fiyat: float,
    stop_mesafe: float | None,
    strateji: Strateji,
) -> float:
    if fiyat <= 0 or equity <= 0:
        return 0.0
    if stop_mesafe is not None and stop_mesafe > 0:
        return (equity * strateji.risk_yuzde) / stop_mesafe
    return (equity * strateji.pozisyon_yuzde) / fiyat


def calistir(df: pd.DataFrame, strateji: Strateji) -> Sonuc:
    if strateji.model == "probe_pyramid":
        from sinayici.probe import calistir_probe_pyramid

        return calistir_probe_pyramid(df, strateji)
    if strateji.model == "always_loop":
        from sinayici.always_loop import calistir_always_loop

        return calistir_always_loop(df, strateji)
    bars = gostergeleri_ekle(df, strateji)
    long_in = kurallari_vele(bars, strateji.giris_uzun)
    long_out = (
        kurallari_vele(bars, strateji.cikis_uzun)
        if strateji.cikis_uzun
        else pd.Series(False, index=bars.index)
    )
    short_in = (
        kurallari_vele(bars, strateji.giris_kisa)
        if strateji.short_acik and strateji.giris_kisa
        else pd.Series(False, index=bars.index)
    )
    short_out = (
        kurallari_vele(bars, strateji.cikis_kisa)
        if strateji.short_acik and strateji.cikis_kisa
        else pd.Series(False, index=bars.index)
    )

    n = len(bars)
    open_ = bars["open"].to_numpy(dtype=float)
    high = bars["high"].to_numpy(dtype=float)
    low = bars["low"].to_numpy(dtype=float)
    close = bars["close"].to_numpy(dtype=float)
    times = bars["time"].to_numpy()
    atr_name = strateji.stop.atr_gosterge
    atr_arr = (
        bars[atr_name].to_numpy(dtype=float)
        if atr_name in bars.columns
        else np.full(n, np.nan)
    )

    pos = 0.0
    entry = 0.0
    stop_px = np.nan
    entry_i = -1
    entry_risk = 0.0
    cash = float(strateji.sermaye)
    equity_hist: list[float] = []
    trades: list[Islem] = []
    pending = 0  # +1 uzun aç, -1 kısa aç, 9 kapat

    def mark_equity(i: int) -> float:
        return float(cash + pos * close[i])

    def kapat(i: int, ham_fiyat: float, neden: str) -> None:
        nonlocal pos, cash, entry, stop_px, entry_i, entry_risk
        if pos == 0.0:
            return
        kayma = strateji.kayma_yuzde
        fill = ham_fiyat * (1 - kayma) if pos > 0 else ham_fiyat * (1 + kayma)
        fee = _komisyon(fill, pos, strateji.komisyon_yuzde)
        pnl = pos * (fill - entry) - fee
        cash += pos * fill - fee
        trades.append(
            Islem(
                yon="uzun" if pos > 0 else "kisa",
                giris_zaman=times[entry_i],
                cikis_zaman=times[i],
                giris=entry,
                cikis=fill,
                adet=abs(pos),
                pnl=pnl,
                neden=neden,
                risk_para=entry_risk,
            )
        )
        pos = 0.0
        entry = 0.0
        stop_px = np.nan
        entry_i = -1
        entry_risk = 0.0

    def ac(i: int, yon: int) -> None:
        nonlocal pos, cash, entry, stop_px, entry_i, entry_risk
        if pos != 0.0:
            return
        fiyat = open_[i]
        stop_mesafe: float | None = None
        if strateji.stop.tur == "yuzde" and strateji.stop.deger > 0:
            stop_mesafe = fiyat * (strateji.stop.deger / 100.0)
        elif strateji.stop.tur == "atr" and strateji.stop.deger > 0:
            a = atr_arr[i - 1] if i > 0 else atr_arr[i]
            if np.isfinite(a):
                stop_mesafe = float(a) * strateji.stop.deger
        mtm = cash
        qty = _adet(mtm, fiyat, stop_mesafe, strateji)
        if qty <= 0:
            return
        kayma = strateji.kayma_yuzde
        fill = fiyat * (1 + kayma) if yon > 0 else fiyat * (1 - kayma)
        fee = _komisyon(fill, qty, strateji.komisyon_yuzde)
        notional = qty * fill
        if yon > 0 and notional + fee > cash:
            qty = max(0.0, (cash * 0.98) / ((1 + kayma) * fiyat * (1 + strateji.komisyon_yuzde)))
            if qty <= 0:
                return
            fill = fiyat * (1 + kayma)
            fee = _komisyon(fill, qty, strateji.komisyon_yuzde)
            notional = qty * fill
        signed = qty if yon > 0 else -qty
        if yon > 0:
            cash -= notional + fee
        else:
            cash += notional - fee
        pos = signed
        entry = fill
        entry_i = i
        if stop_mesafe is not None:
            stop_px = fill - stop_mesafe if yon > 0 else fill + stop_mesafe
            entry_risk = abs(signed) * stop_mesafe
        else:
            stop_px = np.nan
            entry_risk = abs(signed) * fill * strateji.risk_yuzde

    for i in range(n):
        if pending == 9:
            kapat(i, float(open_[i]), "sinyal")
        elif pending in (1, -1) and pos == 0.0:
            ac(i, pending)
        pending = 0

        if pos != 0.0 and np.isfinite(stop_px):
            if pos > 0 and low[i] <= stop_px:
                kapat(i, float(stop_px), "stop")
            elif pos < 0 and high[i] >= stop_px:
                kapat(i, float(stop_px), "stop")

        equity_hist.append(mark_equity(i))

        if pos > 0 and bool(long_out.iloc[i]):
            pending = 9
        elif pos < 0 and bool(short_out.iloc[i]):
            pending = 9
        elif pos == 0.0:
            if bool(long_in.iloc[i]):
                pending = 1
            elif strateji.short_acik and bool(short_in.iloc[i]):
                pending = -1

    if pos != 0.0:
        kapat(n - 1, float(close[n - 1]), "veri_sonu")
        equity_hist[-1] = float(cash)

    eq = pd.DataFrame({"time": bars["time"], "equity": equity_hist})
    return Sonuc(equity=eq, islemler=trades, metrik=_metrik(eq, trades, strateji.sermaye))


def _metrik(eq: pd.DataFrame, trades: list[Islem], start: float) -> dict[str, float]:
    equity = eq["equity"]
    peak = equity.cummax()
    dd = (equity - peak) / peak.replace(0.0, np.nan)
    pnls = [t.pnl for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    gross_win = float(sum(wins)) if wins else 0.0
    gross_loss = float(abs(sum(losses))) if losses else 0.0
    r_list = [t.pnl / t.risk_para for t in trades if t.risk_para > 0]
    long_pnl = [t.pnl for t in trades if t.yon == "uzun"]
    short_pnl = [t.pnl for t in trades if t.yon == "kisa"]
    bitis = float(equity.iloc[-1]) if len(equity) else float(start)
    cagr = _cagr(eq, start, bitis)
    sharpe = _sharpe(eq)
    return {
        "baslangic": float(start),
        "bitis": bitis,
        "net_pnl": bitis - float(start),
        "getiri": (bitis / start - 1.0) if start else 0.0,
        "cagr": cagr,
        "islem_sayisi": float(len(trades)),
        "kazanma_orani": float(len(wins) / len(pnls)) if pnls else 0.0,
        "max_drawdown": float(dd.min()) if len(dd) else 0.0,
        "ortalama_pnl": float(np.mean(pnls)) if pnls else 0.0,
        "profit_factor": (gross_win / gross_loss) if gross_loss > 0 else (float("inf") if gross_win > 0 else 0.0),
        "ortalama_r": float(np.mean(r_list)) if r_list else 0.0,
        "sharpe": sharpe,
        "uzun_pnl": float(sum(long_pnl)),
        "kisa_pnl": float(sum(short_pnl)),
        "uzun_islem": float(len(long_pnl)),
        "kisa_islem": float(len(short_pnl)),
    }


def _cagr(eq: pd.DataFrame, start: float, bitis: float) -> float:
    if start <= 0 or bitis <= 0 or len(eq) < 2:
        return 0.0
    t0 = pd.Timestamp(eq["time"].iloc[0])
    t1 = pd.Timestamp(eq["time"].iloc[-1])
    years = (t1 - t0).total_seconds() / (365.25 * 24 * 3600)
    if years <= 0:
        return 0.0
    return float((bitis / start) ** (1 / years) - 1)


def _sharpe(eq: pd.DataFrame) -> float:
    s = eq.set_index("time")["equity"].astype(float)
    daily = s.resample("1D").last().dropna().pct_change().dropna()
    if len(daily) < 5 or float(daily.std()) == 0.0:
        return 0.0
    return float(daily.mean() / daily.std() * np.sqrt(252))


def aylik_yillik(eq: pd.DataFrame, start: float) -> dict[str, list[dict[str, float | str]]]:
    s = eq.set_index("time")["equity"].astype(float)
    if s.index.tz is not None:
        s = s.tz_convert("Europe/Istanbul")
    monthly = s.resample("ME").last().dropna()
    yearly = s.resample("YE").last().dropna()
    prev_m = start
    aylik: list[dict[str, float | str]] = []
    for ts, val in monthly.items():
        aylik.append(
            {
                "donem": ts.strftime("%Y-%m"),
                "equity": float(val),
                "getiri": float(val / prev_m - 1) if prev_m else 0.0,
            }
        )
        prev_m = float(val)
    prev_y = start
    yillik: list[dict[str, float | str]] = []
    for ts, val in yearly.items():
        yillik.append(
            {
                "donem": ts.strftime("%Y"),
                "equity": float(val),
                "getiri": float(val / prev_y - 1) if prev_y else 0.0,
            }
        )
        prev_y = float(val)
    return {"aylik": aylik, "yillik": yillik}

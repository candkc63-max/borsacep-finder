"""Pine: pozisyon yoksa ters yöne probe; 0.3% kârda 4 ekleme; SL/TP ilk giriş fiyatından."""

from __future__ import annotations

import numpy as np
import pandas as pd

from sinayici.motor import Islem, Sonuc, _komisyon, _metrik
from sinayici.strateji import Strateji


def calistir_always_loop(df: pd.DataFrame, strateji: Strateji) -> Sonuc:
    n = len(df)
    open_ = df["open"].to_numpy(dtype=float)
    high = df["high"].to_numpy(dtype=float)
    low = df["low"].to_numpy(dtype=float)
    close = df["close"].to_numpy(dtype=float)
    times = df["time"].to_numpy()

    kayma = strateji.kayma_yuzde
    kom = strateji.komisyon_yuzde
    scale = strateji.ekleme_yuzde / 100.0
    sl_pct = strateji.stop_maliyet_yuzde / 100.0
    tp_pct = strateji.tp_maliyet_yuzde / 100.0
    mult = float(strateji.sozlesme_carpani)
    probe_q = float(strateji.probe_adet)
    main_q = float(strateji.main_adet)

    cash = float(strateji.sermaye)
    pos = 0.0
    avg = 0.0
    entry = 0.0
    sl = np.nan
    tp = np.nan
    last_dir = -1
    scaled = False
    entry_i = -1
    equity_hist: list[float] = []
    trades: list[Islem] = []

    def kapat(i: int, ham: float, neden: str) -> None:
        nonlocal pos, cash, avg, entry, sl, tp, scaled, entry_i
        if pos == 0.0:
            return
        yon = 1 if pos > 0 else -1
        fill = ham * (1 - kayma) if yon > 0 else ham * (1 + kayma)
        qty = abs(pos)
        fee = _komisyon(fill, qty * mult, kom)
        pnl = pos * (fill - avg) * mult - fee
        cash += pnl
        trades.append(
            Islem(
                yon="uzun" if yon > 0 else "kisa",
                giris_zaman=times[entry_i],
                cikis_zaman=times[i],
                giris=avg,
                cikis=fill,
                adet=qty,
                pnl=pnl,
                neden=neden,
                risk_para=abs(entry) * qty * sl_pct * mult,
            )
        )
        pos = 0.0
        avg = 0.0
        entry = 0.0
        sl = np.nan
        tp = np.nan
        scaled = False
        entry_i = -1

    def ac(i: int, yon: int, qty: float, ham: float) -> None:
        nonlocal pos, cash, avg, entry, sl, tp, scaled, entry_i, last_dir
        fill = ham * (1 + kayma) if yon > 0 else ham * (1 - kayma)
        fee = _komisyon(fill, qty * mult, kom)
        cash -= fee
        signed = qty * yon
        if pos == 0.0:
            pos = signed
            avg = fill
            entry = fill
            entry_i = i
            last_dir = yon
            scaled = False
            if yon > 0:
                sl = entry * (1 - sl_pct)
                tp = entry * (1 + tp_pct)
            else:
                sl = entry * (1 + sl_pct)
                tp = entry * (1 - tp_pct)
        else:
            avg = (abs(pos) * avg + qty * fill) / (abs(pos) + qty)
            pos += signed
            scaled = True

    for i in range(n):
        if pos > 0 and not scaled and high[i] >= entry * (1 + scale):
            ac(i, 1, main_q, float(close[i]))
        elif pos < 0 and not scaled and low[i] <= entry * (1 - scale):
            ac(i, -1, main_q, float(close[i]))

        if pos > 0 and np.isfinite(sl):
            if open_[i] <= sl:
                kapat(i, float(open_[i]), "stop")
            elif open_[i] >= tp:
                kapat(i, float(open_[i]), "tp")
            elif low[i] <= sl:
                kapat(i, float(sl), "stop")
            elif high[i] >= tp:
                kapat(i, float(tp), "tp")
        elif pos < 0 and np.isfinite(sl):
            if open_[i] >= sl:
                kapat(i, float(open_[i]), "stop")
            elif open_[i] <= tp:
                kapat(i, float(open_[i]), "tp")
            elif high[i] >= sl:
                kapat(i, float(sl), "stop")
            elif low[i] <= tp:
                kapat(i, float(tp), "tp")

        if pos == 0.0:
            yon = -1 if last_dir == 1 else 1
            ac(i, yon, probe_q, float(close[i]))

        mark = close[i]
        equity_hist.append(float(cash + pos * (mark - avg) * mult if pos != 0 else cash))

    if pos != 0.0:
        kapat(n - 1, float(close[n - 1]), "veri_sonu")
        equity_hist[-1] = float(cash)

    eq = pd.DataFrame({"time": df["time"], "equity": equity_hist})
    return Sonuc(equity=eq, islemler=trades, metrik=_metrik(eq, trades, strateji.sermaye))

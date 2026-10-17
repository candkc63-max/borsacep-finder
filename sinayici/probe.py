"""EMA200 üstü probe (1) + %0.3 ekleme (4). SL/TP ortalama maliyete göre. Long only."""

from __future__ import annotations

import numpy as np
import pandas as pd

from sinayici.gostergeler import ema
from sinayici.motor import Islem, Sonuc, _komisyon, _metrik
from sinayici.strateji import Strateji


def calistir_probe_pyramid(df: pd.DataFrame, strateji: Strateji) -> Sonuc:
    n = len(df)
    open_ = df["open"].to_numpy(dtype=float)
    high = df["high"].to_numpy(dtype=float)
    low = df["low"].to_numpy(dtype=float)
    close = df["close"].to_numpy(dtype=float)
    times = df["time"].to_numpy()
    ema200 = ema(df["close"], strateji.ema_filtre_periyot).to_numpy(dtype=float)

    kayma = strateji.kayma_yuzde
    kom = strateji.komisyon_yuzde
    scale = strateji.ekleme_yuzde / 100.0
    sl_pct = strateji.stop_maliyet_yuzde / 100.0
    tp_pct = strateji.tp_maliyet_yuzde / 100.0
    total_u = strateji.probe_adet + strateji.main_adet

    cash = float(strateji.sermaye)
    pos = 0.0
    avg = 0.0
    share_unit = 0.0
    main_submitted = False
    main_trigger = np.nan
    entry_i = -1
    pending_probe = False
    exited = False
    equity_hist: list[float] = []
    trades: list[Islem] = []

    def kapat(i: int, ham: float, neden: str) -> None:
        nonlocal pos, cash, avg, share_unit, main_submitted, main_trigger, entry_i, exited
        if pos == 0.0:
            return
        fill = ham * (1 - kayma)
        fee = _komisyon(fill, pos, kom)
        pnl = pos * (fill - avg) - fee
        cash += pos * fill - fee
        risk = abs(avg) * pos * sl_pct
        trades.append(
            Islem(
                yon="uzun",
                giris_zaman=times[entry_i],
                cikis_zaman=times[i],
                giris=avg,
                cikis=fill,
                adet=pos,
                pnl=pnl,
                neden=neden,
                risk_para=risk,
            )
        )
        pos = 0.0
        avg = 0.0
        share_unit = 0.0
        main_submitted = False
        main_trigger = np.nan
        entry_i = -1
        exited = True

    def ac_probe(i: int) -> None:
        nonlocal pos, cash, avg, share_unit, main_submitted, main_trigger, entry_i
        if pos != 0.0:
            return
        fiyat = open_[i]
        if fiyat <= 0 or not np.isfinite(ema200[i]):
            return
        plan = cash * strateji.pozisyon_yuzde
        if plan <= 0:
            return
        fill = fiyat * (1 + kayma)
        unit_notional = plan / total_u
        share_unit = unit_notional / fill
        qty = share_unit * strateji.probe_adet
        fee = _komisyon(fill, qty, kom)
        notional = qty * fill
        if notional + fee > cash:
            return
        cash -= notional + fee
        pos = qty
        avg = fill
        entry_i = i
        main_submitted = False
        main_trigger = fill * (1 + scale)

    def ac_main(i: int, ham: float) -> None:
        nonlocal pos, cash, avg, main_submitted
        if pos == 0.0 or main_submitted or share_unit <= 0:
            return
        fill = ham * (1 + kayma)
        qty = share_unit * strateji.main_adet
        fee = _komisyon(fill, qty, kom)
        notional = qty * fill
        if notional + fee > cash:
            qty = max(0.0, (cash * 0.98) / (fill * (1 + kom)))
            if qty <= 0:
                return
            fee = _komisyon(fill, qty, kom)
            notional = qty * fill
        cash -= notional + fee
        avg = (pos * avg + qty * fill) / (pos + qty)
        pos += qty
        main_submitted = True

    for i in range(n):
        exited = False
        if pending_probe and pos == 0.0:
            ac_probe(i)
        pending_probe = False

        if pos > 0 and not main_submitted and np.isfinite(main_trigger) and high[i] >= main_trigger:
            ham = open_[i] if open_[i] >= main_trigger else main_trigger
            ac_main(i, float(ham))

        if pos > 0:
            sl = avg * (1 - sl_pct)
            tp = avg * (1 + tp_pct)
            if open_[i] <= sl:
                kapat(i, float(open_[i]), "stop")
            elif open_[i] >= tp:
                kapat(i, float(open_[i]), "tp")
            elif low[i] <= sl:
                kapat(i, float(sl), "stop")
            elif high[i] >= tp:
                kapat(i, float(tp), "tp")

        equity_hist.append(float(cash + pos * close[i]))

        if pos == 0.0 and not exited and np.isfinite(ema200[i]) and close[i] > ema200[i]:
            pending_probe = True

    if pos != 0.0:
        kapat(n - 1, float(close[n - 1]), "veri_sonu")
        equity_hist[-1] = float(cash)

    eq = pd.DataFrame({"time": df["time"], "equity": equity_hist})
    return Sonuc(equity=eq, islemler=trades, metrik=_metrik(eq, trades, strateji.sermaye))

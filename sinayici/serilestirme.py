"""Backtest sonucunu JSON'a çevir. inf/NaN yok."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

from sinayici.motor import Sonuc, aylik_yillik


def _sayi(x: float) -> float | None:
    if x is None or not np.isfinite(x):
        return None
    return float(x)


def _ts(v: object) -> str:
    t = pd.Timestamp(v)
    if t.tzinfo is None:
        return t.isoformat()
    return t.isoformat()


def sonuc_json(sonuc: Sonuc, mumlar: pd.DataFrame | None = None) -> dict[str, Any]:
    donem = aylik_yillik(sonuc.equity, float(sonuc.metrik["baslangic"]))
    islemler = [
        {
            "yon": t.yon,
            "giris_zaman": _ts(t.giris_zaman),
            "cikis_zaman": _ts(t.cikis_zaman),
            "giris": _sayi(t.giris),
            "cikis": _sayi(t.cikis),
            "adet": _sayi(t.adet),
            "pnl": _sayi(t.pnl),
            "risk_para": _sayi(t.risk_para),
            "r": _sayi(t.pnl / t.risk_para) if t.risk_para else None,
            "neden": t.neden,
        }
        for t in sonuc.islemler
    ]
    equity = [
        {"time": _ts(r.time), "equity": _sayi(float(r.equity))}
        for r in sonuc.equity.itertuples(index=False)
    ]
    ohlc = []
    if mumlar is not None:
        for r in mumlar.itertuples(index=False):
            ohlc.append(
                {
                    "time": int(pd.Timestamp(r.time).timestamp()),
                    "open": _sayi(float(r.open)),
                    "high": _sayi(float(r.high)),
                    "low": _sayi(float(r.low)),
                    "close": _sayi(float(r.close)),
                }
            )
    return {
        "olusturma": datetime.now().isoformat(timespec="seconds"),
        "metrik": {
            k: _sayi(float(v)) if isinstance(v, (int, float, np.floating, np.integer)) else v
            for k, v in sonuc.metrik.items()
        },
        "islemler": islemler,
        "equity": equity,
        "aylik": donem["aylik"],
        "yillik": donem["yillik"],
        "mumlar": ohlc,
        "uyari": "Simülasyon. Gelecek getiri göstermez. Sinyal kapanışta, dolum sonraki açılışta.",
    }

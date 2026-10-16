"""Sentetik OHLCV — gerçek piyasa değil, motoru denemek için."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from sinayici.csv_okuma import ISTANBUL


def uret_ohlcv(n: int = 800, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    ret = rng.normal(0.0002, 0.008, size=n)
    close = 100 * np.exp(np.cumsum(ret))
    open_ = np.concatenate([[close[0]], close[:-1]])
    high = np.maximum(open_, close) * (1 + rng.uniform(0.0, 0.004, size=n))
    low = np.minimum(open_, close) * (1 - rng.uniform(0.0, 0.004, size=n))
    idx = pd.date_range("2024-01-02 10:00", periods=n, freq="h", tz=ISTANBUL)
    return pd.DataFrame(
        {
            "time": idx,
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": rng.integers(100, 1000, size=n),
        }
    )


def yaz_ornek_csv(yol: Path, n: int = 800) -> Path:
    df = uret_ohlcv(n)
    yol.parent.mkdir(parents=True, exist_ok=True)
    out = pd.DataFrame(
        {
            "<DATE>": df["time"].dt.strftime("%Y.%m.%d"),
            "<TIME>": df["time"].dt.strftime("%H:%M:%S"),
            "<OPEN>": df["open"].map(lambda x: f"{x:.5f}"),
            "<HIGH>": df["high"].map(lambda x: f"{x:.5f}"),
            "<LOW>": df["low"].map(lambda x: f"{x:.5f}"),
            "<CLOSE>": df["close"].map(lambda x: f"{x:.5f}"),
            "<TICKVOL>": df["volume"].astype(int),
            "<VOL>": 0,
            "<SPREAD>": 10,
        }
    )
    out.to_csv(yol, index=False, sep="\t", encoding="utf-8")
    return yol

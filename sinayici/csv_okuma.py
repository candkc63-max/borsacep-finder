"""MT5 / düz OHLCV CSV okuma. Sütun uydurma yok."""

from __future__ import annotations

from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

ISTANBUL = ZoneInfo("Europe/Istanbul")

_RENAME = {
    "<date>": "date",
    "<time>": "time",
    "<open>": "open",
    "<high>": "high",
    "<low>": "low",
    "<close>": "close",
    "<tickvol>": "volume",
    "<vol>": "volume",
    "<spread>": "spread",
    "tarih": "date",
    "saat": "time",
    "zaman": "time",
    "acilis": "open",
    "yuksek": "high",
    "dusuk": "low",
    "kapanis": "close",
    "hacim": "volume",
    "tickvol": "volume",
    "vol": "volume",
}


def _zaman(stamp: pd.Series) -> pd.Series:
    fmts = (
        "%Y.%m.%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d.%m.%Y %H:%M:%S",
        "%Y.%m.%d %H:%M",
        "%Y-%m-%d %H:%M",
        "%Y.%m.%d",
        "%Y-%m-%d",
    )
    for fmt in fmts:
        try:
            return pd.to_datetime(stamp, format=fmt)
        except (ValueError, TypeError):
            continue
    return pd.to_datetime(stamp, format="mixed")


def oku_ohlcv_metin(metin: str) -> pd.DataFrame:
    return oku_ohlcv_frame(pd.read_csv(StringIO(metin), sep=None, engine="python"))


def oku_ohlcv(yol: Path) -> pd.DataFrame:
    return oku_ohlcv_frame(pd.read_csv(yol, sep=None, engine="python"))


def oku_ohlcv_frame(raw: pd.DataFrame) -> pd.DataFrame:
    cols = {str(c).strip().lower(): c for c in raw.columns}
    mapped: dict[str, str] = {}
    for low, orig in cols.items():
        key = _RENAME.get(low, low)
        mapped[orig] = key
    df = raw.rename(columns=mapped)
    df.columns = [str(c).strip().lower() for c in df.columns]
    if df.columns.duplicated().any():
        vol_i = [i for i, c in enumerate(df.columns) if c == "volume"]
        keep = [i for i in range(len(df.columns)) if i not in vol_i[1:]]
        df = df.iloc[:, keep]

    if "time" in df.columns and "date" in df.columns:
        stamp = df["date"].astype(str).str.strip() + " " + df["time"].astype(str).str.strip()
        dt = _zaman(stamp)
    elif "time" in df.columns:
        dt = _zaman(df["time"].astype(str).str.strip())
    elif "date" in df.columns:
        dt = _zaman(df["date"].astype(str).str.strip())
    else:
        raise ValueError("CSV'de date/time veya tarih sütunu yok.")

    if dt.dt.tz is None:
        dt = dt.dt.tz_localize(ISTANBUL, ambiguous="infer", nonexistent="shift_forward")
    else:
        dt = dt.dt.tz_convert(ISTANBUL)

    needed = {"open", "high", "low", "close"}
    missing = needed - set(df.columns)
    if missing:
        raise ValueError(f"CSV'de eksik sütun: {sorted(missing)}")

    out = pd.DataFrame(
        {
            "time": dt,
            "open": pd.to_numeric(df["open"], errors="coerce"),
            "high": pd.to_numeric(df["high"], errors="coerce"),
            "low": pd.to_numeric(df["low"], errors="coerce"),
            "close": pd.to_numeric(df["close"], errors="coerce"),
            "volume": pd.to_numeric(df["volume"], errors="coerce") if "volume" in df.columns else 0.0,
        }
    )
    out = out.dropna(subset=["open", "high", "low", "close"]).sort_values("time")
    out = out.drop_duplicates(subset=["time"], keep="last").reset_index(drop=True)
    if out.empty:
        raise ValueError("CSV'de geçerli mum yok.")
    _bar_tutarliligi(out)
    return out


def _bar_tutarliligi(df: pd.DataFrame) -> None:
    bad = (df["high"] < df[["open", "close", "low"]].max(axis=1)) | (
        df["low"] > df[["open", "close", "high"]].min(axis=1)
    )
    if bool(bad.any()):
        raise ValueError("OHLC tutarsız satır var (high/low open-close ile çelişiyor).")

"""OHLCV: CSV veya gecikmeli Yahoo. Canlı derinlik değil."""

from __future__ import annotations

import pandas as pd

from sinayici.csv_okuma import ISTANBUL, oku_ohlcv_metin


def oku_csv_metin(metin: str) -> pd.DataFrame:
    return oku_ohlcv_metin(metin)


def yahoo_sembol(sembol: str) -> str:
    s = sembol.strip().upper().replace(" ", "")
    if s.endswith(".IS") or s.endswith("=X") or "." in s:
        return s
    bist = {"THYAO", "GARAN", "AKBNK", "EREGL", "SISE", "BIMAS", "KCHOL", "SAHOL", "TUPRS", "ASELS"}
    if s in bist:
        return f"{s}.IS"
    fx = {"EURUSD", "GBPUSD", "USDJPY", "USDTRY", "XAUUSD", "XAGUSD"}
    if s in fx:
        if s.startswith("XAU"):
            return "GC=F"
        if s.startswith("XAG"):
            return "SI=F"
        return f"{s}=X"
    return s


def cek_yahoo(sembol: str, periyot: str, gun: int = 400) -> pd.DataFrame:
    import yfinance as yf

    ham = yahoo_sembol(sembol)
    interval = {"1h": "1h", "1H": "1h", "4h": "1h", "4H": "1h", "1d": "1d", "1D": "1d", "gunluk": "1d"}.get(
        periyot, "1d"
    )
    ticker = yf.Ticker(ham)
    df = ticker.history(period=f"{max(gun, 5)}d", interval=interval, auto_adjust=False)
    if df is None or df.empty:
        raise ValueError(f"Yahoo veri yok: {ham} (gecikmeli kaynak)")
    df = df.rename(columns={"Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume"})
    idx = pd.to_datetime(df.index)
    if idx.tz is None:
        idx = idx.tz_localize("UTC").tz_convert(ISTANBUL)
    else:
        idx = idx.tz_convert(ISTANBUL)
    out = pd.DataFrame(
        {
            "time": idx,
            "open": df["open"].astype(float).to_numpy(),
            "high": df["high"].astype(float).to_numpy(),
            "low": df["low"].astype(float).to_numpy(),
            "close": df["close"].astype(float).to_numpy(),
            "volume": df["volume"].astype(float).to_numpy() if "volume" in df.columns else 0.0,
        }
    )
    if periyot.lower() in {"4h", "4saat"}:
        out = (
            out.set_index("time")
            .resample("4h")
            .agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
            .dropna()
            .reset_index()
        )
    return out.reset_index(drop=True)


def mum_listesinden(rows: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    missing = {"open", "high", "low", "close"} - set(c.lower() for c in df.columns)
    if missing:
        raise ValueError(f"eksik alan: {sorted(missing)}")
    df.columns = [str(c).lower() for c in df.columns]
    if "time" not in df.columns:
        raise ValueError("time alanı yok")
    dt = pd.to_datetime(df["time"], utc=True).dt.tz_convert(ISTANBUL)
    return pd.DataFrame(
        {
            "time": dt,
            "open": pd.to_numeric(df["open"], errors="coerce"),
            "high": pd.to_numeric(df["high"], errors="coerce"),
            "low": pd.to_numeric(df["low"], errors="coerce"),
            "close": pd.to_numeric(df["close"], errors="coerce"),
            "volume": pd.to_numeric(df["volume"], errors="coerce") if "volume" in df.columns else 0.0,
        }
    ).dropna(subset=["open", "high", "low", "close"])

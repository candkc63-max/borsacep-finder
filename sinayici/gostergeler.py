"""Kapanış bazlı indikatörler. Repaint yok; ısınma barında NaN."""

from __future__ import annotations

import numpy as np
import pandas as pd


def sma(close: pd.Series, periyot: int) -> pd.Series:
    return close.rolling(periyot, min_periods=periyot).mean()


def ema(close: pd.Series, periyot: int) -> pd.Series:
    return close.ewm(span=periyot, adjust=False, min_periods=periyot).mean()


def rsi(close: pd.Series, periyot: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    avg_gain = gain.ewm(alpha=1 / periyot, adjust=False, min_periods=periyot).mean()
    avg_loss = loss.ewm(alpha=1 / periyot, adjust=False, min_periods=periyot).mean()
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    return 100 - (100 / (1 + rs))


def atr(high: pd.Series, low: pd.Series, close: pd.Series, periyot: int) -> pd.Series:
    prev_close = close.shift(1)
    tr = pd.concat(
        [(high - low).abs(), (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / periyot, adjust=False, min_periods=periyot).mean()


def zirve(high: pd.Series, periyot: int) -> pd.Series:
    """Son N barın en yükseği; mevcut bar hariç (lookahead yok)."""
    return high.rolling(periyot, min_periods=periyot).max().shift(1)


def dip(low: pd.Series, periyot: int) -> pd.Series:
    """Son N barın en düşüğü; mevcut bar hariç."""
    return low.rolling(periyot, min_periods=periyot).min().shift(1)


def macd(
    close: pd.Series,
    hizli: int = 12,
    yavas: int = 26,
    sinyal: int = 9,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    line = ema(close, hizli) - ema(close, yavas)
    signal = line.ewm(span=sinyal, adjust=False, min_periods=sinyal).mean()
    hist = line - signal
    return line, signal, hist

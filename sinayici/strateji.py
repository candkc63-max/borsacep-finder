"""YAML strateji şeması ve kural derleme."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import pandas as pd
import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

from sinayici.gostergeler import atr, dip, ema, macd, rsi, sma, zirve

FIYAT_TAKMA = {
    "fiyat": "close",
    "kapanis": "close",
    "acilis": "open",
    "yuksek": "high",
    "dusuk": "low",
}


class Gosterge(BaseModel):
    ad: str
    tur: Literal["sma", "ema", "rsi", "atr", "macd", "zirve", "dip"]
    periyot: int | None = None
    hizli: int = 12
    yavas: int = 26
    sinyal: int = 9

    @field_validator("ad")
    @classmethod
    def ad_temiz(cls, v: str) -> str:
        s = v.strip().lower().replace(" ", "_")
        if not s or not s[0].isalpha():
            raise ValueError("gösterge adı harfle başlamalı")
        return s


class StopKural(BaseModel):
    tur: Literal["yok", "yuzde", "atr"] = "yok"
    deger: float = 0.0
    atr_gosterge: str = "atr"


class Strateji(BaseModel):
    ad: str
    model: Literal["klasik", "probe_pyramid", "always_loop"] = "klasik"
    sembol: str = ""
    sermaye: float = 100_000
    komisyon_yuzde: float = 0.001
    kayma_yuzde: float = 0.0005
    risk_yuzde: float = 0.01
    pozisyon_yuzde: float = 0.10
    short_acik: bool = False
    gosterge: list[Gosterge] = Field(default_factory=list)
    giris_uzun: list[str] = Field(default_factory=list)
    cikis_uzun: list[str] = Field(default_factory=list)
    giris_kisa: list[str] = Field(default_factory=list)
    cikis_kisa: list[str] = Field(default_factory=list)
    stop: StopKural = Field(default_factory=StopKural)
    probe_adet: float = 1.0
    main_adet: float = 4.0
    ekleme_yuzde: float = 0.3
    stop_maliyet_yuzde: float = 1.0
    tp_maliyet_yuzde: float = 3.0
    ema_filtre_periyot: int = 200
    sozlesme_carpani: float = 1.0
    sabit_adet: bool = False

    @model_validator(mode="after")
    def klasik_giris_zorunlu(self) -> Strateji:
        if self.model == "klasik" and not self.giris_uzun:
            raise ValueError("giris_uzun boş olamaz")
        return self


def yukle_strateji(yol: Path) -> Strateji:
    with yol.open(encoding="utf-8") as f:
        data: Any = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError("YAML bir nesne (anahtar: değer) olmalı")
    return Strateji.model_validate(data)


def gostergeleri_ekle(df: pd.DataFrame, strateji: Strateji) -> pd.DataFrame:
    out = df.copy()
    close, high, low = out["close"], out["high"], out["low"]
    for g in strateji.gosterge:
        if g.tur in {"sma", "ema", "rsi"} and g.periyot is None:
            raise ValueError(f"{g.ad}: periyot gerekli")
        if g.tur == "sma":
            out[g.ad] = sma(close, int(g.periyot))
        elif g.tur == "ema":
            out[g.ad] = ema(close, int(g.periyot))
        elif g.tur == "rsi":
            out[g.ad] = rsi(close, int(g.periyot))
        elif g.tur == "atr":
            per = int(g.periyot or 14)
            out[g.ad] = atr(high, low, close, per)
        elif g.tur == "zirve":
            if g.periyot is None:
                raise ValueError(f"{g.ad}: periyot gerekli")
            out[g.ad] = zirve(high, int(g.periyot))
        elif g.tur == "dip":
            if g.periyot is None:
                raise ValueError(f"{g.ad}: periyot gerekli")
            out[g.ad] = dip(low, int(g.periyot))
        else:
            line, sig, hist = macd(close, g.hizli, g.yavas, g.sinyal)
            out[g.ad] = line
            out[f"{g.ad}_sinyal"] = sig
            out[f"{g.ad}_hist"] = hist
    return out


def _seri(df: pd.DataFrame, ad: str) -> pd.Series:
    key = FIYAT_TAKMA.get(ad, ad)
    if key not in df.columns:
        raise ValueError(f"bilinmeyen seri: {ad}")
    return df[key]


def kural_maske(df: pd.DataFrame, kural: str) -> pd.Series:
    parca = kural.strip().lower().split()
    if len(parca) == 3 and parca[1] in {"esik_ustu", "esik_alti"}:
        seri = _seri(df, parca[0])
        esik = float(parca[2])
        if parca[1] == "esik_ustu":
            return seri > esik
        return seri < esik
    if len(parca) == 3 and parca[2] in {"yukari_keser", "asagi_keser", "ustunde", "altinda"}:
        left, right = _seri(df, parca[0]), _seri(df, parca[1])
        op = parca[2]
        if op == "yukari_keser":
            return (left > right) & (left.shift(1) <= right.shift(1))
        if op == "asagi_keser":
            return (left < right) & (left.shift(1) >= right.shift(1))
        if op == "ustunde":
            return left > right
        return left < right
    raise ValueError(
        f"kural anlaşılamadı: {kural!r}. "
        "Örnek: 'ema20 ema50 yukari_keser' veya 'rsi14 esik_alti 30'"
    )


def kurallari_vele(df: pd.DataFrame, kurallar: list[str]) -> pd.Series:
    if not kurallar:
        return pd.Series(False, index=df.index)
    mask = pd.Series(True, index=df.index)
    for k in kurallar:
        mask = mask & kural_maske(df, k)
    return mask.fillna(False)

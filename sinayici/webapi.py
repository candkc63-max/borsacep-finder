#!/usr/bin/env python3
"""Trading Can Backtester API. Canlı emir yok."""

from __future__ import annotations

import logging
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from sinayici.kayit import kaydet, liste
from sinayici.motor import calistir
from sinayici.optimizasyon import ızgara
from sinayici.ornek_veri import uret_ohlcv
from sinayici.serilestirme import sonuc_json
from sinayici.strateji import Strateji
from sinayici.veri import cek_yahoo, mum_listesinden, oku_csv_metin

LOG = logging.getLogger("sinayici.api")

app = FastAPI(title="Trading Can Backtester", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ORNEK_YAML = """ad: ema200_zirve20
sembol: AAPL
sermaye: 100000
komisyon_yuzde: 0.001
kayma_yuzde: 0.0005
risk_yuzde: 0.01
pozisyon_yuzde: 0.10
short_acik: false

gosterge:
  - ad: ema200
    tur: ema
    periyot: 200
  - ad: ema20
    tur: ema
    periyot: 20
  - ad: zirve20
    tur: zirve
    periyot: 20
  - ad: atr
    tur: atr
    periyot: 14

giris_uzun:
  - fiyat ema200 ustunde
  - fiyat zirve20 ustunde
cikis_uzun:
  - fiyat ema20 altinda

stop:
  tur: atr
  deger: 2
"""


class BacktestIstek(BaseModel):
    yaml_text: str
    sermaye: float | None = None
    risk_percent: float | None = None
    csv_text: str | None = None
    sembol: str | None = None
    periyot: str = "1d"
    gun: int = 500
    sentetik: bool = False
    mumlar: list[dict[str, Any]] | None = None
    kaydet_kosu: bool = True


class OptimizeIstek(BacktestIstek):
    grid: dict[str, list[float]] = Field(default_factory=dict)


def _strateji(ist: BacktestIstek) -> Strateji:
    data = yaml.safe_load(ist.yaml_text)
    if not isinstance(data, dict):
        raise ValueError("YAML nesne olmalı")
    if ist.sermaye is not None:
        data["sermaye"] = ist.sermaye
    if ist.risk_percent is not None:
        data["risk_yuzde"] = float(ist.risk_percent) / 100.0
    return Strateji.model_validate(data)


def _veri(ist: BacktestIstek):
    if ist.sentetik:
        return uret_ohlcv(800)
    if ist.csv_text:
        return oku_csv_metin(ist.csv_text)
    if ist.mumlar:
        return mum_listesinden(ist.mumlar)
    if ist.sembol:
        return cek_yahoo(ist.sembol, ist.periyot, ist.gun)
    raise ValueError("csv_text, sembol, mumlar veya sentetik gerekli")


@app.get("/api/saglik")
def saglik() -> dict[str, str]:
    return {"durum": "ok"}


@app.get("/api/ornek-yaml")
def ornek() -> dict[str, str]:
    return {"yaml_text": ORNEK_YAML}


@app.get("/api/kosular")
def kosular() -> dict[str, Any]:
    return {"kosular": liste()}


@app.post("/api/backtest")
def backtest(ist: BacktestIstek) -> dict[str, Any]:
    try:
        st = _strateji(ist)
        df = _veri(ist)
        if len(df) < 30:
            raise ValueError("en az 30 mum gerekli")
        sonuc = calistir(df, st)
        out = sonuc_json(sonuc, df)
        out["ad"] = st.ad
        out["sembol"] = st.sembol or ist.sembol or "csv"
        out["sermaye"] = st.sermaye
        out["risk_yuzde"] = st.risk_yuzde
        if ist.kaydet_kosu:
            out["kosu_id"] = kaydet(st.ad, ist.yaml_text, out)
        return out
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — API sınırı
        LOG.exception("backtest")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/optimize")
def optimize(ist: OptimizeIstek) -> dict[str, Any]:
    if not ist.grid:
        raise HTTPException(status_code=400, detail="grid boş")
    try:
        st = _strateji(ist)
        df = _veri(ist)
        rows = ızgara(st, df, ist.grid)
        return {
            "ad": st.ad,
            "sonuclar": rows,
            "uyari": "Izgara araması overfitting üretebilir. Out-of-sample ayrı koş.",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

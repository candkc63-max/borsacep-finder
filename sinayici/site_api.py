"""BORSA101 köprüsü. FastAPI yok, koşu kaydı yazılmaz."""

from __future__ import annotations

import json
import logging
import math
import sys
from typing import Any

import numpy as np
import yaml

from sinayici.motor import calistir
from sinayici.optimizasyon import ızgara
from sinayici.ornek_veri import uret_ohlcv
from sinayici.serilestirme import sonuc_json
from sinayici.strateji import Strateji
from sinayici.veri import cek_yahoo, mum_listesinden, oku_csv_metin

LOG = logging.getLogger("sinayici.site")

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


def _temiz(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _temiz(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_temiz(v) for v in value]
    if isinstance(value, (np.floating, float)):
        number = float(value)
        return number if math.isfinite(number) else None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value


def _strateji(ist: dict[str, Any]) -> Strateji:
    data = yaml.safe_load(ist.get("yaml_text") or "")
    if not isinstance(data, dict):
        raise ValueError("YAML nesne olmalı")
    if ist.get("sermaye") is not None:
        data["sermaye"] = ist["sermaye"]
    if ist.get("risk_percent") is not None:
        data["risk_yuzde"] = float(ist["risk_percent"]) / 100.0
    return Strateji.model_validate(data)


def _veri(ist: dict[str, Any]):
    if ist.get("sentetik"):
        return uret_ohlcv(800)
    if ist.get("csv_text"):
        return oku_csv_metin(ist["csv_text"])
    if ist.get("mumlar"):
        return mum_listesinden(ist["mumlar"])
    if ist.get("sembol"):
        return cek_yahoo(ist["sembol"], ist.get("periyot") or "1d", int(ist.get("gun") or 500))
    raise ValueError("csv_text, sembol, mumlar veya sentetik gerekli")


def handle(path: str, body: dict[str, Any] | None) -> tuple[int, dict[str, Any]]:
    route = (path or "").split("?")[0].rstrip("/")
    ist = body or {}
    try:
        if route.endswith("/saglik"):
            return 200, {"durum": "ok"}
        if route.endswith("/ornek-yaml") or route.endswith("/ornek_yaml"):
            return 200, {"yaml_text": ORNEK_YAML}
        if route.endswith("/kosular"):
            return 200, {"kosular": []}
        if route.endswith("/backtest"):
            st = _strateji(ist)
            df = _veri(ist)
            if len(df) < 30:
                raise ValueError("en az 30 mum gerekli")
            sonuc = calistir(df, st)
            out = sonuc_json(sonuc, df)
            out["ad"] = st.ad
            out["sembol"] = st.sembol or ist.get("sembol") or "csv"
            out["sermaye"] = st.sermaye
            out["risk_yuzde"] = st.risk_yuzde
            return 200, _temiz(out)
        if route.endswith("/optimize"):
            grid = ist.get("grid") or {}
            if not grid:
                return 400, {"detail": "grid boş"}
            st = _strateji(ist)
            df = _veri(ist)
            rows = ızgara(st, df, grid)
            return 200, _temiz(
                {
                    "ad": st.ad,
                    "sonuclar": rows,
                    "uyari": "Izgara araması overfitting üretebilir. Out-of-sample ayrı koş.",
                }
            )
        return 404, {"detail": "yok"}
    except ValueError as exc:
        return 400, {"detail": str(exc)}
    except Exception as exc:  # noqa: BLE001 — API sınırı
        LOG.exception("site api")
        return 500, {"detail": str(exc)}


def main() -> None:
    raw = sys.stdin.read() or "{}"
    req = json.loads(raw)
    status, payload = handle(str(req.get("path") or ""), req.get("body") or {})
    json.dump({"status": status, "body": payload}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()

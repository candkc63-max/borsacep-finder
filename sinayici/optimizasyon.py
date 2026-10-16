"""Küçük ızgara arama. 40 kombinasyon tavanı."""

from __future__ import annotations

from copy import deepcopy
from itertools import product
from typing import Any

from sinayici.motor import calistir
from sinayici.strateji import Strateji


def _set_path(st: Strateji, path: str, value: float) -> Strateji:
    data = st.model_dump()
    if path == "stop.deger":
        data["stop"]["deger"] = float(value)
    elif path == "risk_yuzde":
        data["risk_yuzde"] = float(value)
    elif path == "sermaye":
        data["sermaye"] = float(value)
    elif path.startswith("gosterge.") and path.endswith(".periyot"):
        ad = path.split(".")[1]
        found = False
        for g in data["gosterge"]:
            if g["ad"] == ad:
                g["periyot"] = int(value)
                found = True
        if not found:
            raise ValueError(f"gösterge yok: {ad}")
    else:
        raise ValueError(f"optimize edilemeyen alan: {path}")
    return Strateji.model_validate(data)


def ızgara(strateji: Strateji, df, grid: dict[str, list[float]], tavan: int = 40) -> list[dict[str, Any]]:
    keys = list(grid.keys())
    values = [grid[k] for k in keys]
    combos = list(product(*values))
    if len(combos) > tavan:
        raise ValueError(f"en fazla {tavan} kombinasyon (şimdi {len(combos)})")
    rows: list[dict[str, Any]] = []
    for combo in combos:
        st = deepcopy(strateji)
        params: dict[str, float] = {}
        for k, v in zip(keys, combo, strict=True):
            st = _set_path(st, k, v)
            params[k] = float(v)
        sonuc = calistir(df, st)
        m = sonuc.metrik
        rows.append(
            {
                "parametre": params,
                "net_pnl": m["net_pnl"],
                "cagr": m.get("cagr"),
                "max_drawdown": m["max_drawdown"],
                "profit_factor": m.get("profit_factor") if m.get("profit_factor") != float("inf") else None,
                "kazanma_orani": m["kazanma_orani"],
                "islem_sayisi": m["islem_sayisi"],
                "sharpe": m.get("sharpe"),
            }
        )
    rows.sort(key=lambda r: (r["net_pnl"] is None, -(r["net_pnl"] or 0)))
    return rows

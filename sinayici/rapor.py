"""Özet ve CSV çıktıları. Getiri vaadi yok."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from sinayici.motor import Sonuc


def islemler_tablosu(sonuc: Sonuc) -> pd.DataFrame:
    rows = [
        {
            "yon": t.yon,
            "giris_zaman": t.giris_zaman,
            "cikis_zaman": t.cikis_zaman,
            "giris": t.giris,
            "cikis": t.cikis,
            "adet": t.adet,
            "pnl": t.pnl,
            "neden": t.neden,
        }
        for t in sonuc.islemler
    ]
    return pd.DataFrame(rows)


def ozet_metin(sonuc: Sonuc, strateji_ad: str) -> str:
    m = sonuc.metrik
    return (
        f"strateji: {strateji_ad}\n"
        f"baslangic: {m['baslangic']:.2f}\n"
        f"bitis: {m['bitis']:.2f}\n"
        f"net_pnl: {m['net_pnl']:.2f}\n"
        f"islem_sayisi: {int(m['islem_sayisi'])}\n"
        f"kazanma_orani: {m['kazanma_orani']:.1%}\n"
        f"max_drawdown: {m['max_drawdown']:.1%}\n"
        f"ortalama_pnl: {m['ortalama_pnl']:.2f}\n"
        "not: bu bir simülasyon; gelecek getiri göstermez. "
        "sinyal mum kapanışında, işlem bir sonraki açılışta.\n"
    )


def yaz_cikti(sonuc: Sonuc, klasor: Path, strateji_ad: str) -> None:
    klasor.mkdir(parents=True, exist_ok=True)
    (klasor / "ozet.txt").write_text(ozet_metin(sonuc, strateji_ad), encoding="utf-8")
    sonuc.equity.to_csv(klasor / "equity.csv", index=False, encoding="utf-8-sig")
    tab = islemler_tablosu(sonuc)
    tab.to_csv(klasor / "islemler.csv", index=False, encoding="utf-8-sig")

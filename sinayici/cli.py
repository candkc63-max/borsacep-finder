#!/usr/bin/env python3
"""YAML stratejiyi MT5 CSV üzerinde sınar. Canlı emir yok."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from sinayici.csv_okuma import oku_ohlcv
from sinayici.motor import calistir
from sinayici.ornek_veri import yaz_ornek_csv
from sinayici.rapor import ozet_metin, yaz_cikti
from sinayici.strateji import yukle_strateji

LOG = logging.getLogger("sinayici")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Kendi strateji sınayıcın. Kurallar YAML'de, veri MT5 CSV."
    )
    p.add_argument("--strateji", type=Path, help="YAML strateji dosyası")
    p.add_argument("--veri", type=Path, help="MT5 veya düz OHLCV CSV")
    p.add_argument("--cikti", type=Path, default=Path("rapor"), help="özet ve CSV klasörü")
    p.add_argument(
        "--ornek-veri",
        type=Path,
        help="sentetik MT5 biçimli CSV yaz ve çık (gerçek piyasa değil)",
    )
    p.add_argument("-v", action="store_true", help="ayrıntılı log")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(level=logging.DEBUG if args.v else logging.INFO, format="%(message)s")
    if args.ornek_veri:
        yaz_ornek_csv(args.ornek_veri)
        print(f"örnek CSV yazıldı: {args.ornek_veri}")
        return 0
    if args.strateji is None or args.veri is None:
        LOG.error("--strateji ve --veri gerekli (veya önce --ornek-veri)")
        return 2
    try:
        strateji = yukle_strateji(args.strateji)
        bars = oku_ohlcv(args.veri)
        sonuc = calistir(bars, strateji)
    except (OSError, ValueError) as exc:
        LOG.error("%s", exc)
        return 1
    yaz_cikti(sonuc, args.cikti, strateji.ad)
    print(ozet_metin(sonuc, strateji.ad), end="")
    print(f"dosyalar: {args.cikti / 'ozet.txt'}, islemler.csv, equity.csv")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

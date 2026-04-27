from __future__ import annotations

import time
from datetime import datetime
from typing import Optional

import pandas as pd
import yfinance as yf


# ---------------------------------------------------------------------------
# BIST 100 hisse listesi (yfinance sembolleri ".IS" uzantılı)
# ---------------------------------------------------------------------------
BIST100_TICKERS: list[str] = [
    "AEFES", "AGHOL", "AKBNK", "AKFGY", "AKSA", "AKSEN", "ALARK", "ALBRK",
    "ALFAS", "ARCLK", "ASELS", "ASTOR", "BERA", "BIENY", "BIMAS", "BRSAN",
    "BRYAT", "CCOLA", "CIMSA", "DOAS", "DOHOL", "ECILC", "ECZYT", "EGEEN",
    "EKGYO", "ENERY", "ENJSA", "ENKAI", "ERBOS", "EREGL", "EUREN", "FROTO",
    "GARAN", "GESAN", "GUBRF", "HALKB", "HEKTS", "ISCTR", "ISMEN", "IZMDC",
    "KAYSE", "KCAER", "KCHOL", "KLSER", "KMPUR", "KONTR", "KONYA", "KOZAA",
    "KOZAL", "KRDMD", "MAVI", "MGROS", "MIATK", "OBAMS", "ODAS", "OTKAR",
    "OYAKC", "PAPIL", "PEKGY", "PENTA", "PETKM", "PGSUS", "REEDR", "SAHOL",
    "SASA", "SDTTR", "SISE", "SKBNK", "SMRTG", "SOKM", "TABGD", "TAVHL",
    "TCELL", "THYAO", "TKFEN", "TKNSA", "TOASO", "TSKB", "TTKOM", "TTRAK",
    "TUKAS", "TUPRS", "TURSG", "ULKER", "VAKBN", "VESBE", "VESTL", "YEOTK",
    "YKBNK", "YYLGD", "ZOREN",
]


# ---------------------------------------------------------------------------
# Tarama parametreleri
# ---------------------------------------------------------------------------
LOOKBACK_DAYS: int = 120  # 50 SMA + 2x21 günlük hacim için yeterli geçmiş
SMA_PERIOD: int = 50  # Hareketli ortalama uzunluğu
VOLUME_WINDOW: int = 21  # ~1 ay (işlem günü)
VOLUME_INCREASE_THRESHOLD: float = 0.50  # %50


def analyze_ticker(symbol: str) -> Optional[dict]:
    """
    Tek bir hisseyi analiz eder. Kriterleri sağlıyorsa sonuç sözlüğünü,
    sağlamıyor ya da veri yetersizse None döndürür.
    """
    yf_symbol = f"{symbol}.IS"

    try:
        df = yf.download(
            yf_symbol,
            period=f"{LOOKBACK_DAYS}d",
            interval="1d",
            progress=False,
            auto_adjust=False,
        )
    except Exception as exc:
        print(f"[!] {symbol}: indirme hatası — {exc}")
        return None

    if df is None or df.empty:
        return None

    # MultiIndex kolon ihtimaline karşı düzleştir
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.dropna(subset=["Close", "Volume"])

    # Yeterli veri var mı?
    if len(df) < SMA_PERIOD + 2 * VOLUME_WINDOW:
        return None

    # 50 günlük SMA
    df["SMA50"] = df["Close"].rolling(window=SMA_PERIOD).mean()

    last_close = float(df["Close"].iloc[-1])
    last_sma = float(df["SMA50"].iloc[-1])

    # Hacim karşılaştırması: son 21 gün vs önceki 21 gün
    last_month_vol = float(df["Volume"].iloc[-VOLUME_WINDOW:].mean())
    prev_month_vol = float(df["Volume"].iloc[-2 * VOLUME_WINDOW : -VOLUME_WINDOW].mean())

    if prev_month_vol == 0:
        return None

    volume_change = (last_month_vol - prev_month_vol) / prev_month_vol

    # Kriterleri uygula
    above_sma = last_close > last_sma
    volume_spiked = volume_change >= VOLUME_INCREASE_THRESHOLD

    if above_sma and volume_spiked:
        return {
            "Hisse": symbol,
            "Fiyat": round(last_close, 2),
            "SMA50": round(last_sma, 2),
            "SMA50 Üstü %": round((last_close / last_sma - 1) * 100, 2),
            "Hacim Değişim %": round(volume_change * 100, 2),
            "Son 21G Ort Hacim": int(last_month_vol),
            "Önceki 21G Ort Hacim": int(prev_month_vol),
        }
    return None


def scan_bist100() -> pd.DataFrame:
    """BIST 100 listesini tarar ve kriterleri sağlayanları DataFrame olarak döndürür."""
    results: list[dict] = []
    total = len(BIST100_TICKERS)

    print(f"BIST 100 taraması başlıyor — {total} hisse, {datetime.now():%Y-%m-%d %H:%M}")
    print("Kriterler:")
    print(
        f"  • Son {VOLUME_WINDOW} günün ortalama hacmi, önceki {VOLUME_WINDOW} güne göre "
        f">= %{int(VOLUME_INCREASE_THRESHOLD * 100)} artmış"
    )
    print(f"  • Kapanış > {SMA_PERIOD} günlük SMA")
    print("-" * 70)

    for idx, symbol in enumerate(BIST100_TICKERS, start=1):
        match = analyze_ticker(symbol)
        status = "✓" if match else "·"
        print(f"  [{idx:>3}/{total}] {status} {symbol}")
        if match:
            results.append(match)
        # API'yi yormamak için küçük bir bekleme
        time.sleep(0.15)

    if not results:
        return pd.DataFrame()

    df = pd.DataFrame(results)
    df = df.sort_values("Hacim Değişim %", ascending=False).reset_index(drop=True)
    return df


def main() -> None:
    df = scan_bist100()

    print("\n" + "=" * 70)
    if df.empty:
        print("Kriterleri sağlayan hisse bulunamadı.")
        return

    print(f"Kriterleri sağlayan {len(df)} hisse:\n")
    # Tüm kolonları sığdırmak için:
    pd.set_option("display.width", 140)
    pd.set_option("display.max_columns", None)
    print(df.to_string(index=False))

    # CSV olarak da kaydet
    out_path = f"bist100_tarama_{datetime.now():%Y%m%d_%H%M}.csv"
    df.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"\nSonuçlar kaydedildi: {out_path}")


if __name__ == "__main__":
    main()

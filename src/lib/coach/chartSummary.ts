import { calcRSI, calcMACD, calcBollinger, calcSMA } from "@/lib/indicators";

interface StockInput {
  symbol: string;
  name: string;
  prices: number[]; // newest first
}

/**
 * Hisse verilerinden Koç için özet metin üretir.
 * Al/sat tavsiyesi istemez — Koç'un nesnel durumu yorumlamasını ve duygusal tuzağı
 * işaret etmesini ister (FOMO mı, panik mi, gerçekçi mi).
 */
export function buildStockSummaryForCoach(stock: StockInput): string {
  const prices = stock.prices;
  if (prices.length < 2) {
    return `${stock.symbol} (${stock.name}) için veri yetersiz. Yorum yapamam.`;
  }

  const last = prices[0]!;
  const prev = prices[1]!;
  const dayChange = ((last - prev) / prev) * 100;

  // 30 ve 60 günlük değişim
  const p30 = prices[Math.min(30, prices.length - 1)] ?? prices[prices.length - 1]!;
  const p60 = prices[Math.min(60, prices.length - 1)] ?? prices[prices.length - 1]!;
  const change30 = ((last - p30) / p30) * 100;
  const change60 = ((last - p60) / p60) * 100;

  // 60 günlük zirve/dip
  const last60 = prices.slice(0, 60);
  const high60 = Math.max(...last60);
  const low60 = Math.min(...last60);
  const fromHigh = ((high60 - last) / high60) * 100;
  const fromLow = ((last - low60) / low60) * 100;

  // İndikatörler
  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  const bb = calcBollinger(prices);
  const sma20 = calcSMA(prices, 20);
  const sma50 = calcSMA(prices, 50);
  const sma200 = calcSMA(prices, 200);

  const lines: string[] = [];
  lines.push(`${stock.symbol} (${stock.name}) — anlık fiyat ${last.toFixed(2)} TL.`);
  lines.push(
    `Günlük: ${fmt(dayChange)} · 30 gün: ${fmt(change30)} · 60 gün: ${fmt(change60)}`,
  );
  lines.push(
    `60 gün zirvesi ${high60.toFixed(2)} (uzaklık %${fromHigh.toFixed(1)}), dibi ${low60.toFixed(2)} (uzaklık %${fromLow.toFixed(1)})`,
  );

  const techBits: string[] = [];
  if (rsi !== null) {
    const rsiLabel = rsi >= 70 ? "aşırı alım" : rsi <= 30 ? "aşırı satım" : "nötr";
    techBits.push(`RSI ${rsi.toFixed(0)} (${rsiLabel})`);
  }
  if (macd) {
    const macdLabel = macd.histogram > 0 ? "pozitif momentum" : "negatif momentum";
    techBits.push(`MACD histogram ${macd.histogram.toFixed(2)} (${macdLabel})`);
  }
  if (bb) {
    const bbLabel =
      last > bb.upper ? "üst Bollinger dışında"
      : last < bb.lower ? "alt Bollinger dışında"
      : "Bollinger bantları içinde";
    techBits.push(bbLabel);
  }
  if (sma20 && sma50) {
    techBits.push(
      last > sma50 ? "fiyat SMA50 üstünde" : "fiyat SMA50 altında",
    );
  }
  if (sma50 && sma200) {
    techBits.push(sma50 > sma200 ? "SMA50 > SMA200 (pozitif yapı)" : "SMA50 < SMA200 (negatif yapı)");
  }

  if (techBits.length > 0) {
    lines.push(`Teknik: ${techBits.join(" · ")}.`);
  }

  lines.push("");
  lines.push("Koç olarak kısa ve net konuş (maksimum 3 paragraf):");
  lines.push("1) Bu tablo duygusal olarak neyi tetikliyor olabilir? (FOMO, korku, açgözlülük, umut)");
  lines.push("2) Rakamların söylediği ile hissettiğim şey arasında bir gerilim var mı?");
  lines.push("3) Al/sat tavsiyesi verme. Kararı ben vereceğim — sen sadece düşünmeme yardım et.");

  return lines.join("\n");
}

function fmt(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

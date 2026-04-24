import type { PortfolioItem } from "@/hooks/usePortfolio";
import { getSector, type Sector } from "@/lib/sectors";

/**
 * #6 Ak\u0131ll\u0131 Portf\u00f6y Da\u011f\u0131l\u0131m\u0131
 *
 * Portf\u00f6y\u00fcndeki konsantrasyonu analiz eder:
 * - Sekt\u00f6r da\u011f\u0131l\u0131m\u0131 (tek sekt\u00f6r %40+ → k\u0131rm\u0131z\u0131 bayrak)
 * - Pozisyon say\u0131s\u0131 (1-3 \u00e7ok konsantre, 10+ \u00e7ok da\u011f\u0131n\u0131k)
 * - En b\u00fcy\u00fck pozisyonun a\u011f\u0131rl\u0131\u011f\u0131 (%30+ \u2192 k\u0131rm\u0131z\u0131 bayrak)
 * - Risk skoru (0-100, y\u00fcksek = risk y\u00fcksek)
 */

export interface PortfolioDiagnostic {
  totalValue: number;
  positionCount: number;
  topPositionWeight: number;
  topPositionSymbol: string | null;
  sectorBreakdown: Array<{ sector: Sector; weight: number; symbols: string[] }>;
  concentrationScore: number; // 0-100, y\u00fcksek = riskli
  flags: string[];
  suggestions: string[];
}

export function diagnosePortfolio(
  portfolio: PortfolioItem[],
  priceMap: Record<string, number>,
): PortfolioDiagnostic | null {
  if (portfolio.length === 0) return null;

  let totalValue = 0;
  const positionValues: Array<{ symbol: string; value: number; sector: Sector }> = [];

  for (const item of portfolio) {
    const price = priceMap[item.symbol] ?? item.buyPrice;
    const value = price * item.quantity;
    totalValue += value;
    positionValues.push({
      symbol: item.symbol,
      value,
      sector: getSector(item.symbol),
    });
  }

  if (totalValue === 0) return null;

  positionValues.sort((a, b) => b.value - a.value);
  const top = positionValues[0]!;
  const topPositionWeight = (top.value / totalValue) * 100;

  // Sekt\u00f6r da\u011f\u0131l\u0131m\u0131
  const sectorMap = new Map<Sector, { value: number; symbols: string[] }>();
  for (const p of positionValues) {
    const existing = sectorMap.get(p.sector) ?? { value: 0, symbols: [] };
    existing.value += p.value;
    existing.symbols.push(p.symbol);
    sectorMap.set(p.sector, existing);
  }

  const sectorBreakdown = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      weight: (data.value / totalValue) * 100,
      symbols: data.symbols,
    }))
    .sort((a, b) => b.weight - a.weight);

  const flags: string[] = [];
  const suggestions: string[] = [];
  let concentration = 0;

  if (topPositionWeight > 40) {
    flags.push(`${top.symbol} portföyünün %${topPositionWeight.toFixed(0)}'si — çok yüksek konsantrasyon`);
    concentration += 30;
    suggestions.push("Tek hisseye bu kadar ağırlık vermek risk. %15-20'nin altına çekmeyi düşün.");
  } else if (topPositionWeight > 25) {
    flags.push(`${top.symbol} %${topPositionWeight.toFixed(0)} — yüksek ağırlık`);
    concentration += 15;
  }

  const topSector = sectorBreakdown[0];
  if (topSector && topSector.weight > 50) {
    flags.push(
      `${topSector.sector} sektörü portföyün %${topSector.weight.toFixed(0)}'si — tek sektör hakimiyeti`,
    );
    concentration += 25;
    suggestions.push(
      `${topSector.sector} dışında farklı sektörlere (${otherSectorsHint()}) açılmayı değerlendir.`,
    );
  } else if (topSector && topSector.weight > 35) {
    flags.push(`${topSector.sector} %${topSector.weight.toFixed(0)} — yüksek sektör ağırlığı`);
    concentration += 10;
  }

  if (portfolio.length < 3) {
    flags.push(`Sadece ${portfolio.length} pozisyon — yetersiz dağılım`);
    concentration += 20;
    suggestions.push("3 hisse altı çok konsantre. En az 5-10 hisse ile çeşitlendirmek makul.");
  } else if (portfolio.length > 15) {
    flags.push(`${portfolio.length} pozisyon — çok dağınık, takip güç`);
    concentration += 5;
    suggestions.push("15+ hisse bireysel yatırımcı için fazla. Düşük konviksyonlu olanları temizle.");
  }

  // Sekt\u00f6r \u00e7e\u015fitlili\u011fi
  if (sectorMap.size === 1) {
    concentration += 15;
  } else if (sectorMap.size >= 5) {
    concentration = Math.max(0, concentration - 5);
  }

  concentration = Math.max(0, Math.min(100, concentration));

  if (flags.length === 0) {
    suggestions.push("Portföyün dengeli görünüyor. Disiplini ve stop-loss'ları korumaya devam et.");
  }

  return {
    totalValue,
    positionCount: portfolio.length,
    topPositionWeight,
    topPositionSymbol: top.symbol,
    sectorBreakdown,
    concentrationScore: concentration,
    flags,
    suggestions,
  };
}

function otherSectorsHint(): string {
  return "Bankacılık, Sanayi, Enerji, Teknoloji, Gıda, Perakende";
}

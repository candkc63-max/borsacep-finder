import { describe, expect, it } from "vitest";
import { mapYahooQuote } from "@/data/yahooQuote";

describe("mapYahooQuote", () => {
  it("converts Yahoo ratios into the filter row", () => {
    const stock = mapYahooQuote(
      { ticker: "THYAO", name: "Türk Hava Yolları", sector: "Havacılık" },
      {
        price: { regularMarketPrice: { raw: 276.75 }, marketCap: { raw: 379_779_416_064 } },
        summaryDetail: { trailingPE: { raw: 5.4 }, dividendRate: { raw: 6.88 }, dividendYield: { raw: 0 } },
        defaultKeyStatistics: { priceToBook: { raw: 1.8 }, "52WeekChange": { raw: -0.04 } },
        financialData: { returnOnEquity: { raw: 0.13129 }, currentPrice: { raw: 276.75 } },
      },
    );
    expect(stock.price).toBe(276.75);
    expect(stock.pe).toBe(5.4);
    expect(stock.roe).toBeCloseTo(13.129);
    expect(stock.change1y).toBeCloseTo(-4);
    expect(stock.dividendYield).toBeCloseTo((6.88 / 276.75) * 100);
  });

  it("keeps quote fields that Yahoo actually returns and leaves the rest empty", () => {
    const stock = mapYahooQuote(
      { ticker: "GARAN", name: "Garanti BBVA", sector: "Bankacılık" },
      {
        price: { regularMarketPrice: { raw: 100 }, regularMarketChangePercent: { raw: 1.25 }, regularMarketVolume: { raw: 2_000_000 }, marketCap: { raw: 10 } },
        summaryDetail: { averageVolume: { raw: 1_000_000 }, fiftyTwoWeekHigh: { raw: 110 } },
        defaultKeyStatistics: { trailingEps: { raw: 4.5 } },
        financialData: { earningsGrowth: { raw: 0.2 }, revenueGrowth: { raw: 0.1 } },
      },
    );
    expect(stock.changeDay).toBe(1.25);
    expect(stock.relativeVolume).toBe(2);
    expect(stock.eps).toBe(4.5);
    expect(stock.earningsGrowth).toBeCloseTo(20);
    expect(stock.revenueGrowth).toBeCloseTo(10);
    expect(stock.week52Distance).toBeCloseTo((10 / 110) * 100);
    expect(stock.pb).toBeNull();
  });
});

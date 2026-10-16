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
});

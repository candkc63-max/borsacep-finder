import { describe, expect, it } from "vitest";
import { EMPTY_FILTER, STOCKS, filterStocks } from "@/data/stocks";

describe("filterStocks", () => {
  it("returns the full list when filters are empty", () => {
    expect(filterStocks(STOCKS, EMPTY_FILTER)).toHaveLength(STOCKS.length);
  });

  it("matches ticker and company name", () => {
    const byTicker = filterStocks(STOCKS, { ...EMPTY_FILTER, search: "thyao" });
    expect(byTicker.map((s) => s.ticker)).toEqual(["THYAO"]);

    const byName = filterStocks(STOCKS, { ...EMPTY_FILTER, search: "garanti" });
    expect(byName.map((s) => s.ticker)).toEqual(["GARAN"]);
  });

  it("keeps stocks inside the numeric limits and drops missing values", () => {
    const rows = filterStocks(STOCKS, {
      ...EMPTY_FILTER,
      sector: "Bankacılık",
      peMax: "4.2",
      roeMin: "25",
      dividendMin: "2",
    });
    expect(rows.map((s) => s.ticker).sort()).toEqual(["AKBNK", "GARAN"]);
  });
});

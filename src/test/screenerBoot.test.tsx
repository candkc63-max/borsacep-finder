import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";
import { STOCKS } from "@/data/stocks";

describe("screener boot", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = "";
    vi.unstubAllGlobals();
  });

  it("does not bulk-fetch quotes until the scan starts", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("bist-quotes")) {
        return {
          ok: true,
          json: async () => ({
            stocks: STOCKS.map((stock) => ({ ...stock, dataStatus: "ok", dataSource: "Yahoo Finance", dataAsOf: "2026-10-21T12:00:00.000Z" })),
            asOf: "2026-10-21T12:00:00.000Z",
          }),
        };
      }
      return { ok: true, json: async () => ({ bars: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    expect(screen.getByTestId("screen-idle")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^screen-row-/)).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Hazır filtre"), { target: { value: "dividend" } });
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("screen-run"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const quoteCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("bist-quotes"));
    expect(quoteCalls).toHaveLength(1);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("chart-bars"))).toBe(false);
    expect(await screen.findByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
  });
});

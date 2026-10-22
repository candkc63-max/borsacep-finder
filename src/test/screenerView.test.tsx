import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { STOCKS } from "@/data/stocks";
import { Screener } from "@/screener/Screener";

const sample = STOCKS.filter((stock) => ["THYAO", "FROTO", "ULKER", "LOGO"].includes(stock.ticker));

function renderScreen(pageSize = 25, loadBars = false, onScan?: () => Promise<void> | void) {
  const onOpen = vi.fn();
  render(<Screener stocks={sample} sourceLabel="örnek liste" onOpen={onOpen} onScan={onScan} loadBars={loadBars} pageSize={pageSize} />);
  return onOpen;
}

async function runScan() {
  fireEvent.click(screen.getByTestId("screen-run"));
}

describe("screener screen", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("starts empty and waits for an explicit scan", async () => {
    renderScreen();
    expect(screen.getByTestId("screen-idle")).toHaveTextContent("Hisseleri keşfetmek için filtre oluşturun veya hazır bir tarama seçin.");
    expect(screen.queryAllByTestId(/^screen-row-/)).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Hazır filtre"), { target: { value: "dividend" } });
    expect(screen.getByLabelText("Filtre adı")).toHaveValue("Temettü hisseleri");
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-idle")).toBeInTheDocument();
    await runScan();
    expect(await screen.findByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-clear"));
    expect(screen.getByTestId("screen-idle")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^screen-row-/)).toHaveLength(0);
  });

  it("adds and removes a price filter only after the scan starts", async () => {
    renderScreen();
    fireEvent.click(screen.getByTestId("screen-add-filter"));
    fireEvent.change(screen.getByLabelText("Son fiyat değeri"), { target: { value: "400" } });
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    await runScan();
    expect(await screen.findByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtreyi sil" }));
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    await runScan();
    expect(await screen.findByTestId("screen-row-THYAO")).toBeInTheDocument();
  });

  it("saves, reloads, copies and deletes a screen", async () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText("Filtre adı"), { target: { value: "Hacimli teknik" } });
    fireEvent.click(screen.getByTestId("screen-add-filter"));
    fireEvent.change(screen.getByLabelText("Son fiyat değeri"), { target: { value: "400" } });
    fireEvent.click(screen.getByTestId("screen-save"));
    fireEvent.click(screen.getByTestId("screen-copy"));
    const saved = screen.getByLabelText("Kaydedilmiş filtre");
    expect(within(saved).getByRole("option", { name: "Hacimli teknik kopya" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-delete"));
    expect(within(saved).queryByRole("option", { name: "Hacimli teknik kopya" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-clear"));
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-idle")).toBeInTheDocument();
    const original = within(saved).getByRole("option", { name: "Hacimli teknik" }) as HTMLOptionElement;
    fireEvent.change(saved, { target: { value: original.value } });
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    await runScan();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    expect(await screen.findByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("borsa101-screener") ?? "[]")).toHaveLength(1);
  });

  it("sorts, hides a column and switches the technical tab", async () => {
    renderScreen();
    await runScan();
    await screen.findByTestId("screen-row-THYAO");
    fireEvent.click(screen.getByRole("button", { name: "Sırala Son fiyat" }));
    const rows = screen.getAllByTestId(/^screen-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "screen-row-FROTO");
    fireEvent.click(screen.getByTestId("screen-columns"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hacim" }));
    expect(screen.queryByRole("button", { name: "Sırala Hacim" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-tab-technical"));
    expect(screen.getByRole("button", { name: "Sırala RSI" })).toBeInTheDocument();
  });

  it("pages the list and scrolls sideways", async () => {
    renderScreen(1);
    await runScan();
    expect(await screen.findByTestId("screen-row-THYAO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-page-next"));
    expect(screen.getByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.getByTestId("screen-table-wrap")).toHaveAttribute("data-scroll", "x");
    expect(screen.getByTestId("col-resize-ticker")).toBeInTheDocument();
  });

  it("shows sample coverage and refuses unverified index universes", async () => {
    renderScreen();
    await runScan();
    expect((await screen.findByTestId("screen-coverage")).textContent).toContain("0 tarandı");
    expect(screen.getByTestId("screen-coverage").textContent).toContain("4 örnek");
    expect(screen.getAllByText("Örnek liste · canlı kotasyon yok").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Evren"), { target: { value: "bist100" } });
    expect(screen.getByTestId("screen-membership")).toHaveTextContent("doğrulanmış");
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    await runScan();
    expect(await screen.findByTestId("screen-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
  });

  it("opens the chart and keeps a watchlist", async () => {
    const onOpen = renderScreen();
    await runScan();
    fireEvent.click(await screen.findByTestId("screen-row-THYAO"));
    fireEvent.click(screen.getByTestId("screen-open-FROTO"));
    expect(onOpen).toHaveBeenNthCalledWith(1, "THYAO", false);
    expect(onOpen).toHaveBeenNthCalledWith(2, "FROTO", true);
    fireEvent.click(screen.getByTestId("screen-watch-LOGO"));
    fireEvent.change(screen.getByLabelText("Evren"), { target: { value: "watch" } });
    expect(screen.queryByTestId("screen-row-LOGO")).not.toBeInTheDocument();
    await runScan();
    expect(await screen.findByTestId("screen-row-LOGO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-fav-LOGO"));
    expect(JSON.parse(localStorage.getItem("borsa101-favorites") ?? "[]")).toEqual(["LOGO"]);
  });

  it("searches the catalog without listing a scan", () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText("Hisse ara"), { target: { value: "logo" } });
    expect(screen.getByTestId("screen-search-row-LOGO")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^screen-row-/)).toHaveLength(0);
    expect(screen.queryByTestId("screen-idle")).not.toBeInTheDocument();
  });

  it("keeps a failed scan apart from an empty result", async () => {
    renderScreen(25, false, () => Promise.reject(new Error("quotes")));
    await runScan();
    expect(await screen.findByTestId("screen-error")).toHaveTextContent("Canlı veri alınamadı");
    expect(screen.queryByTestId("screen-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("screen-idle")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^screen-row-/)).toHaveLength(0);
  });

  it("does not request indicator bars until a scan needs them", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ bars: [] }) }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen(25, true);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Hazır filtre"), { target: { value: "dividend" } });
    await runScan();
    expect(await screen.findByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Hazır filtre"), { target: { value: "ema" } });
    expect(fetchMock).not.toHaveBeenCalled();
    await runScan();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.every((url) => url.includes("/api/chart-bars"))).toBe(true);
    expect(urls.some((url) => url.includes("bist-quotes"))).toBe(false);
  });
});

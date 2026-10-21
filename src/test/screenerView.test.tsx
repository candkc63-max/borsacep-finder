import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { STOCKS } from "@/data/stocks";
import { Screener } from "@/screener/Screener";

const sample = STOCKS.filter((stock) => ["THYAO", "FROTO", "ULKER", "LOGO"].includes(stock.ticker));

function renderScreen(pageSize = 25) {
  const onOpen = vi.fn();
  render(<Screener stocks={sample} sourceLabel="örnek liste" onOpen={onOpen} loadBars={false} pageSize={pageSize} />);
  return onOpen;
}

describe("screener screen", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("applies a dividend preset from the menu", () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText("Hazır filtre"), { target: { value: "dividend" } });
    expect(screen.getByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Filtre adı")).toHaveValue("Temettü hisseleri");
  });

  it("adds and removes a price filter", () => {
    renderScreen();
    fireEvent.click(screen.getByTestId("screen-add-filter"));
    fireEvent.change(screen.getByLabelText("Son fiyat değeri"), { target: { value: "400" } });
    expect(screen.getByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtreyi sil" }));
    expect(screen.getByTestId("screen-row-THYAO")).toBeInTheDocument();
  });

  it("saves, reloads, copies and deletes a screen", () => {
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
    expect(screen.getByTestId("screen-row-THYAO")).toBeInTheDocument();
    const original = within(saved).getByRole("option", { name: "Hacimli teknik" }) as HTMLOptionElement;
    fireEvent.change(saved, { target: { value: original.value } });
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("borsa101-screener") ?? "[]")).toHaveLength(1);
  });

  it("sorts, hides a column and switches the technical tab", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Sırala Son fiyat" }));
    const rows = screen.getAllByTestId(/screen-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "screen-row-FROTO");
    fireEvent.click(screen.getByTestId("screen-columns"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hacim" }));
    expect(screen.queryByRole("button", { name: "Sırala Hacim" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-tab-technical"));
    expect(screen.getByRole("button", { name: "Sırala RSI" })).toBeInTheDocument();
  });

  it("pages the list and scrolls sideways", () => {
    renderScreen(1);
    expect(screen.getByTestId("screen-row-THYAO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-FROTO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-page-next"));
    expect(screen.getByTestId("screen-row-FROTO")).toBeInTheDocument();
    expect(screen.getByTestId("screen-table-wrap")).toHaveAttribute("data-scroll", "x");
    expect(screen.getByTestId("col-resize-ticker")).toBeInTheDocument();
  });

  it("shows sample coverage and refuses unverified index universes", () => {
    renderScreen();
    expect(screen.getByTestId("screen-coverage").textContent).toContain("0 tarandı");
    expect(screen.getByTestId("screen-coverage").textContent).toContain("4 örnek");
    expect(screen.getAllByText("Örnek liste · canlı kotasyon yok").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Evren"), { target: { value: "bist100" } });
    expect(screen.getByTestId("screen-membership")).toHaveTextContent("doğrulanmış");
    expect(screen.getByTestId("screen-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
  });

  it("opens the chart and keeps a watchlist", () => {
    const onOpen = renderScreen();
    fireEvent.click(screen.getByTestId("screen-row-THYAO"));
    fireEvent.click(screen.getByTestId("screen-open-FROTO"));
    expect(onOpen).toHaveBeenNthCalledWith(1, "THYAO", false);
    expect(onOpen).toHaveBeenNthCalledWith(2, "FROTO", true);
    fireEvent.click(screen.getByTestId("screen-watch-LOGO"));
    fireEvent.change(screen.getByLabelText("Evren"), { target: { value: "watch" } });
    expect(screen.getByTestId("screen-row-LOGO")).toBeInTheDocument();
    expect(screen.queryByTestId("screen-row-THYAO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("screen-fav-LOGO"));
    expect(JSON.parse(localStorage.getItem("borsa101-favorites") ?? "[]")).toEqual(["LOGO"]);
  });
});

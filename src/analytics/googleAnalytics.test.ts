import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GA_MEASUREMENT_ID,
  installGoogleAnalyticsPageViews,
  pageViewParams,
  uninstallGoogleAnalyticsPageViews,
} from "./googleAnalytics";

describe("page view params", () => {
  it("keeps the hash so filter and chart views stay distinct", () => {
    expect(
      pageViewParams(
        {
          href: "https://borsa101.com/#grafik",
          pathname: "/",
          search: "",
          hash: "#grafik",
        },
        "BORSA101 — Hisse Filtreleme",
      ),
    ).toEqual({
      page_title: "BORSA101 — Hisse Filtreleme",
      page_location: "https://borsa101.com/#grafik",
      page_path: "/#grafik",
    });
  });

  it("keeps the query string on the filter view", () => {
    expect(
      pageViewParams(
        {
          href: "https://borsa101.com/?q=thyao",
          pathname: "/",
          search: "?q=thyao",
          hash: "",
        },
        "BORSA101",
      ).page_path,
    ).toBe("/?q=thyao");
  });
});

describe("spa page views", () => {
  afterEach(() => {
    uninstallGoogleAnalyticsPageViews();
    delete window.gtag;
  });

  it("sends one page_view on startup and one more for each hash change", () => {
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => {
      calls.push(args);
    };
    const listeners: EventListener[] = [];
    const addEventListener = vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      if (type === "hashchange") listeners.push(listener as EventListener);
    });

    installGoogleAnalyticsPageViews();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("event");
    expect(calls[0][1]).toBe("page_view");
    expect(listeners).toHaveLength(1);

    listeners[0](new Event("hashchange"));
    expect(calls).toHaveLength(2);

    installGoogleAnalyticsPageViews();
    listeners[0](new Event("hashchange"));
    expect(listeners).toHaveLength(1);
    expect(calls).toHaveLength(3);

    addEventListener.mockRestore();
  });

  it("does not send a page view when the tag is missing", () => {
    installGoogleAnalyticsPageViews();
    expect(window.gtag).toBeUndefined();
  });
});

describe("google tag snippet", () => {
  it("installs the measurement id once and leaves the first page view to the app", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    const scriptSources = html.match(/googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/g) ?? [];

    expect(GA_MEASUREMENT_ID).toBe("G-LSWGHNJWQN");
    expect(scriptSources).toEqual([`googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`]);
    expect(html.match(/gtag\('config', 'G-[A-Z0-9]+'/g)).toEqual([`gtag('config', '${GA_MEASUREMENT_ID}'`]);
    expect(html).toContain("send_page_view: false");
  });
});

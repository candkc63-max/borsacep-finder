export const GA_MEASUREMENT_ID = "G-LSWGHNJWQN";

type Gtag = (command: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export type PageViewParams = {
  page_title: string;
  page_location: string;
  page_path: string;
};

type PageLocation = {
  href: string;
  pathname: string;
  search: string;
  hash: string;
};

export function pageViewParams(location: PageLocation, title: string): PageViewParams {
  return {
    page_title: title,
    page_location: location.href,
    page_path: `${location.pathname}${location.search}${location.hash}`,
  };
}

export function sendPageView(gtag: Gtag, location: PageLocation, title: string) {
  gtag("event", "page_view", pageViewParams(location, title));
}

let removeHashListener: (() => void) | null = null;

export function installGoogleAnalyticsPageViews() {
  if (removeHashListener || typeof window === "undefined") return;

  const track = () => {
    if (typeof window.gtag !== "function") return;
    sendPageView(window.gtag, window.location, document.title);
  };

  track();
  window.addEventListener("hashchange", track);
  removeHashListener = () => {
    window.removeEventListener("hashchange", track);
    removeHashListener = null;
  };
}

export function uninstallGoogleAnalyticsPageViews() {
  removeHashListener?.();
}

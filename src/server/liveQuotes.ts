import { STOCKS, type Stock } from "../data/stocks";
import { mapYahooQuote, type YahooModules } from "../data/yahooQuote";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function yahooSession(): Promise<{ cookie: string; crumb: string }> {
  const first = await fetch("https://fc.yahoo.com", {
    headers: { "user-agent": UA },
    redirect: "manual",
  });
  const parts = typeof first.headers.getSetCookie === "function" ? first.headers.getSetCookie() : [];
  let cookie = parts.map((item) => item.split(";")[0]).join("; ");
  if (!cookie) {
    cookie = (first.headers.get("set-cookie") ?? "")
      .split(",")
      .map((item) => item.split(";")[0].trim())
      .filter((item) => item.includes("="))
      .join("; ");
  }
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "user-agent": UA, cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes(" ") || crumb.startsWith("<") || crumb.startsWith("{")) {
    throw new Error("Yahoo crumb alınamadı");
  }
  return { cookie, crumb };
}

async function fetchOne(ticker: string, session: { cookie: string; crumb: string }): Promise<YahooModules> {
  const url = new URL(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}.IS`);
  url.searchParams.set("modules", "summaryDetail,defaultKeyStatistics,financialData,price");
  url.searchParams.set("crumb", session.crumb);
  const response = await fetch(url, { headers: { "user-agent": UA, cookie: session.cookie } });
  if (!response.ok) throw new Error(`${ticker} ${response.status}`);
  const body = await response.json() as { quoteSummary?: { result?: YahooModules[] } };
  const modules = body.quoteSummary?.result?.[0];
  if (!modules) throw new Error(`${ticker} boş`);
  return modules;
}

export async function loadLiveQuotes(): Promise<Stock[]> {
  const session = await yahooSession();
  const stocks: Stock[] = [];
  const size = 4;
  for (let i = 0; i < STOCKS.length; i += size) {
    const slice = STOCKS.slice(i, i + size);
    const batch = await Promise.all(slice.map(async (stock) => {
      try {
        const modules = await fetchOne(stock.ticker, session);
        const mapped = mapYahooQuote(stock, modules);
        if (!mapped.price) return null;
        return mapped;
      } catch {
        return null;
      }
    }));
    stocks.push(...batch.filter((item): item is Stock => item != null));
  }
  if (stocks.length === 0) throw new Error("Yahoo verisi boş");
  return stocks;
}

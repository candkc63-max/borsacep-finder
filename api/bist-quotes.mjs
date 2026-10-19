// src/data/stocks.ts
var STOCKS = [
  { ticker: "GARAN", name: "Garanti BBVA", sector: "Bankac\u0131l\u0131k", price: 95.5, marketCap: 35e10, pe: 4.2, pb: 1.1, roe: 28, dividendYield: 3.2, change1y: 42 },
  { ticker: "AKBNK", name: "Akbank", sector: "Bankac\u0131l\u0131k", price: 65.3, marketCap: 28e10, pe: 3.8, pb: 0.9, roe: 26, dividendYield: 2.8, change1y: 38 },
  { ticker: "YKBNK", name: "Yap\u0131 Kredi", sector: "Bankac\u0131l\u0131k", price: 32.4, marketCap: 22e10, pe: 4.5, pb: 1, roe: 24, dividendYield: 2.5, change1y: 35 },
  { ticker: "ISCTR", name: "\u0130\u015F Bankas\u0131 C", sector: "Bankac\u0131l\u0131k", price: 14.5, marketCap: 195e9, pe: 4, pb: 0.85, roe: 22, dividendYield: 3.8, change1y: 32 },
  { ticker: "VAKBN", name: "Vak\u0131fbank", sector: "Bankac\u0131l\u0131k", price: 22.8, marketCap: 145e9, pe: 3.2, pb: 0.7, roe: 25, dividendYield: 1.5, change1y: 48 },
  { ticker: "ASELS", name: "Aselsan", sector: "Savunma", price: 132.5, marketCap: 28e10, pe: 18.5, pb: 4.2, roe: 22, dividendYield: 1.2, change1y: 65 },
  { ticker: "KCHOL", name: "Ko\xE7 Holding", sector: "Holding", price: 165.3, marketCap: 42e10, pe: 8.2, pb: 1.4, roe: 18, dividendYield: 4.5, change1y: 28 },
  { ticker: "SAHOL", name: "Sabanc\u0131 Holding", sector: "Holding", price: 92.8, marketCap: 285e9, pe: 6.5, pb: 1.1, roe: 17, dividendYield: 5.2, change1y: 22 },
  { ticker: "EREGL", name: "Ere\u011Fli Demir \xC7elik", sector: "Demir-\xC7elik", price: 43.5, marketCap: 152e9, pe: 12.5, pb: 0.95, roe: 8, dividendYield: 6.8, change1y: -8 },
  { ticker: "TUPRS", name: "T\xFCpra\u015F", sector: "Enerji", price: 165.4, marketCap: 165e9, pe: 5.2, pb: 1.8, roe: 32, dividendYield: 8.5, change1y: 18 },
  { ticker: "BIMAS", name: "B\u0130M Ma\u011Fazalar\u0131", sector: "Perakende", price: 425.2, marketCap: 195e9, pe: 22.5, pb: 5.8, roe: 28, dividendYield: 1.8, change1y: 55 },
  { ticker: "MGROS", name: "Migros", sector: "Perakende", price: 285, marketCap: 92e9, pe: 18.2, pb: 4.5, roe: 25, dividendYield: 2.5, change1y: 48 },
  { ticker: "ULKER", name: "\xDClker Bisk\xFCvi", sector: "G\u0131da", price: 125.5, marketCap: 48e9, pe: 14.5, pb: 2.2, roe: 16, dividendYield: 3.5, change1y: 28 },
  { ticker: "FROTO", name: "Ford Otosan", sector: "Otomotiv", price: 615, marketCap: 215e9, pe: 7.5, pb: 2.8, roe: 38, dividendYield: 12.5, change1y: 32 },
  { ticker: "TOASO", name: "Tofa\u015F Oto", sector: "Otomotiv", price: 285, marketCap: 95e9, pe: 6.8, pb: 2.4, roe: 35, dividendYield: 8.2, change1y: 18 },
  { ticker: "THYAO", name: "T\xFCrk Hava Yollar\u0131", sector: "Havac\u0131l\u0131k", price: 352, marketCap: 485e9, pe: 5.5, pb: 1.8, roe: 38, dividendYield: 0, change1y: 42 },
  { ticker: "PGSUS", name: "Pegasus", sector: "Havac\u0131l\u0131k", price: 545, marketCap: 45e9, pe: 6.2, pb: 2.1, roe: 32, dividendYield: 0, change1y: 52 },
  { ticker: "TCELL", name: "Turkcell", sector: "Telekom", price: 82.5, marketCap: 145e9, pe: 11.5, pb: 1.8, roe: 18, dividendYield: 4.2, change1y: 12 },
  { ticker: "TTKOM", name: "T\xFCrk Telekom", sector: "Telekom", price: 48.2, marketCap: 88e9, pe: 8.5, pb: 1.4, roe: 17, dividendYield: 5.5, change1y: 8 },
  { ticker: "ENKAI", name: "Enka \u0130n\u015Faat", sector: "\u0130n\u015Faat", price: 38.5, marketCap: 165e9, pe: 8.5, pb: 1.2, roe: 14, dividendYield: 3.8, change1y: 22 },
  { ticker: "EKGYO", name: "Emlak Konut GYO", sector: "GYO", price: 21.5, marketCap: 82e9, pe: 6.8, pb: 0.85, roe: 12, dividendYield: 2.5, change1y: 15 },
  { ticker: "SISE", name: "\u015Ei\u015Fecam", sector: "Cam", price: 42.8, marketCap: 95e9, pe: 9.5, pb: 1.4, roe: 15, dividendYield: 3.2, change1y: 18 },
  { ticker: "PETKM", name: "Petkim", sector: "Kimya", price: 18.5, marketCap: 38e9, pe: 22.5, pb: 1.8, roe: 8, dividendYield: 1.2, change1y: -8 },
  { ticker: "SASA", name: "SASA Polyester", sector: "Kimya", price: 132, marketCap: 285e9, pe: 28.5, pb: 8.5, roe: 32, dividendYield: 0, change1y: 22 },
  { ticker: "LOGO", name: "Logo Yaz\u0131l\u0131m", sector: "Teknoloji", price: 145, marketCap: 18e9, pe: 25.5, pb: 6.2, roe: 28, dividendYield: 1.8, change1y: 38 },
  { ticker: "KAREL", name: "Karel Elektronik", sector: "Teknoloji", price: 88, marketCap: 85e8, pe: 32.5, pb: 4.8, roe: 18, dividendYield: 0.8, change1y: 18 },
  { ticker: "ANHYT", name: "Anadolu Hayat Emeklilik", sector: "Sigorta", price: 56, marketCap: 125e8, pe: 5.8, pb: 1.2, roe: 22, dividendYield: 8.5, change1y: 22 },
  { ticker: "TURSG", name: "T\xFCrkiye Sigorta", sector: "Sigorta", price: 68, marketCap: 18e9, pe: 4.5, pb: 1, roe: 25, dividendYield: 6.5, change1y: 28 },
  { ticker: "ARCLK", name: "Ar\xE7elik", sector: "Beyaz E\u015Fya", price: 95, marketCap: 65e9, pe: 12.8, pb: 1.5, roe: 14, dividendYield: 2.8, change1y: 18 },
  { ticker: "VESTL", name: "Vestel", sector: "Elektronik", price: 38, marketCap: 22e9, pe: 18.5, pb: 1.8, roe: 10, dividendYield: 0, change1y: 5 },
  { ticker: "TKFEN", name: "Tekfen Holding", sector: "Holding", price: 58, marketCap: 35e9, pe: 7.2, pb: 1.1, roe: 16, dividendYield: 3.5, change1y: 25 },
  { ticker: "AKSA", name: "Aksa Akrilik", sector: "Kimya", price: 52, marketCap: 28e9, pe: 9.5, pb: 1.6, roe: 18, dividendYield: 4.2, change1y: 22 }
];
var SECTORS = Array.from(new Set(STOCKS.map((s) => s.sector))).sort((a, b) => a.localeCompare(b, "tr"));

// src/data/yahooQuote.ts
function raw(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "raw" in value) {
    const n = value.raw;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }
  return null;
}
function dividendPercent(summary, price) {
  const stated = raw(summary?.dividendYield);
  if (stated != null && stated > 0) return stated > 1 ? stated : stated * 100;
  const rate = raw(summary?.dividendRate);
  if (rate != null && rate > 0 && price != null && price > 0) return rate / price * 100;
  return stated;
}
function mapYahooQuote(base, modules) {
  const price = raw(modules.financialData?.currentPrice) ?? raw(modules.price?.regularMarketPrice);
  const pe = raw(modules.summaryDetail?.trailingPE) ?? raw(modules.defaultKeyStatistics?.trailingPE);
  const change = raw(modules.defaultKeyStatistics?.["52WeekChange"]);
  const roe = raw(modules.financialData?.returnOnEquity);
  return {
    ticker: base.ticker,
    name: base.name,
    sector: base.sector,
    price: price ?? 0,
    marketCap: raw(modules.price?.marketCap) ?? raw(modules.summaryDetail?.marketCap) ?? 0,
    pe,
    pb: raw(modules.defaultKeyStatistics?.priceToBook),
    roe: roe == null ? null : roe * 100,
    dividendYield: dividendPercent(modules.summaryDetail, price),
    change1y: change == null ? null : change * 100
  };
}

// src/server/liveQuotes.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
async function yahooSession() {
  const first = await fetch("https://fc.yahoo.com", {
    headers: { "user-agent": UA },
    redirect: "manual"
  });
  const parts = typeof first.headers.getSetCookie === "function" ? first.headers.getSetCookie() : [];
  let cookie = parts.map((item) => item.split(";")[0]).join("; ");
  if (!cookie) {
    cookie = (first.headers.get("set-cookie") ?? "").split(",").map((item) => item.split(";")[0].trim()).filter((item) => item.includes("=")).join("; ");
  }
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "user-agent": UA, cookie }
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes(" ") || crumb.startsWith("<") || crumb.startsWith("{")) {
    throw new Error("Yahoo crumb al\u0131namad\u0131");
  }
  return { cookie, crumb };
}
async function fetchOne(ticker, session) {
  const url = new URL(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}.IS`);
  url.searchParams.set("modules", "summaryDetail,defaultKeyStatistics,financialData,price");
  url.searchParams.set("crumb", session.crumb);
  const response = await fetch(url, { headers: { "user-agent": UA, cookie: session.cookie } });
  if (!response.ok) throw new Error(`${ticker} ${response.status}`);
  const body = await response.json();
  const modules = body.quoteSummary?.result?.[0];
  if (!modules) throw new Error(`${ticker} bo\u015F`);
  return modules;
}
async function loadLiveQuotes() {
  const session = await yahooSession();
  const stocks = [];
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
    stocks.push(...batch.filter((item) => item != null));
  }
  if (stocks.length === 0) throw new Error("Yahoo verisi bo\u015F");
  return stocks;
}

// src/server/http/nodeRes.ts
function send(res, status, body) {
  res.status(status).json(body);
}

// src/server/http/quotesHandler.ts
async function load() {
  try {
    const stocks = await loadLiveQuotes();
    return { status: 200, body: { source: "yahoo", asOf: (/* @__PURE__ */ new Date()).toISOString(), stocks } };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Canl\u0131 veri al\u0131namad\u0131";
    return { status: 502, body: { error: message } };
  }
}
async function GET() {
  const result = await load();
  return Response.json(result.body, { status: result.status });
}
async function handler(_req, res) {
  const result = await load();
  send(res, result.status, result.body);
}
export {
  GET,
  handler as default
};

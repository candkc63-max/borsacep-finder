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

// chart/lib/chartSearch.ts
function choice(item) {
  return item;
}
var NAS100_CHOICE = choice({
  id: "nas100-60",
  title: "Nasdaq 100",
  detail: "60 dk \xB7 dosya",
  source: "csv",
  keywords: "nasdaq nas100 endeks",
  symbol: "NAS100",
  name: "Nasdaq 100",
  group: "endeks",
  interval: "60dk",
  sector: ""
});
var PRESETS = [
  choice({ id: "xu100-1h", title: "BIST 100", detail: "saatlik \xB7 Yahoo", source: "yahoo", keywords: "endeks xu100 bist saatlik 1s", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1s", sector: "" }),
  choice({ id: "xu100-4h", title: "BIST 100", detail: "4 saatlik \xB7 Yahoo", source: "yahoo", keywords: "endeks xu100 bist 4 saat 4s", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "4s", sector: "" }),
  choice({ id: "xu100-1d", title: "BIST 100", detail: "g\xFCnl\xFCk \xB7 Yahoo", source: "yahoo", keywords: "endeks xu100 bist g\xFCnl\xFCk 1g", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1G", sector: "" }),
  choice({ id: "xu100-1wk", title: "BIST 100", detail: "haftal\u0131k \xB7 Yahoo", source: "yahoo", keywords: "endeks xu100 bist haftal\u0131k 1h", symbol: "XU100", name: "BIST 100", group: "endeks", interval: "1H", sector: "" }),
  NAS100_CHOICE,
  choice({ id: "ixic-1d", title: "Nasdaq", detail: "g\xFCnl\xFCk \xB7 Yahoo", source: "yahoo", keywords: "nasdaq ixic endeks g\xFCnl\xFCk", symbol: "IXIC", name: "Nasdaq", group: "endeks", interval: "1G", sector: "" })
];
var STOCK_CHOICES = STOCKS.map((stock) => choice({
  id: `stock-${stock.ticker}`,
  title: stock.ticker,
  detail: `${stock.name} \xB7 g\xFCnl\xFCk \xB7 Yahoo`,
  source: "yahoo",
  keywords: `${stock.ticker} ${stock.name} ${stock.sector} hisse`,
  symbol: stock.ticker,
  name: stock.name,
  group: "hisse",
  interval: "1G",
  sector: stock.sector
}));
var ALL = [...PRESETS, ...STOCK_CHOICES];
function choiceById(id) {
  return [...PRESETS, ...STOCK_CHOICES].find((item) => item.id === id) ?? null;
}

// chart/lib/yahooBars.ts
function istanbulIso(epochSeconds) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(epochSeconds * 1e3));
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:00+03:00`;
}
function labelOf(time) {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]} ${match[4]}:${match[5]}`;
}
function barsFromYahoo(body) {
  const result = body.chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote) return [];
  const bars = [];
  for (let index = 0; index < times.length; index += 1) {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    if (open == null || high == null || low == null || close == null) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    const time = istanbulIso(times[index]);
    const volume = quote.volume?.[index];
    bars.push({
      time,
      label: labelOf(time),
      open,
      high,
      low,
      close,
      volume: volume != null && Number.isFinite(volume) ? volume : null
    });
  }
  return bars;
}
function groupFourHours(bars) {
  const groups = /* @__PURE__ */ new Map();
  for (const bar of bars) {
    const match = bar.time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
    if (!match) continue;
    const hour = Math.floor(Number(match[2]) / 4) * 4;
    const time = `${match[1]}T${String(hour).padStart(2, "0")}:00:00+03:00`;
    const current = groups.get(time);
    if (!current) {
      groups.set(time, { ...bar, time, label: `${match[1].slice(8, 10)}.${match[1].slice(5, 7)} ${String(hour).padStart(2, "0")}:00` });
      continue;
    }
    current.high = Math.max(current.high, bar.high);
    current.low = Math.min(current.low, bar.low);
    current.close = bar.close;
    current.volume = current.volume == null && bar.volume == null ? null : (current.volume ?? 0) + (bar.volume ?? 0);
  }
  return [...groups.values()];
}

// src/server/chartBars.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
function chartSpec(id, interval) {
  const stock = id.match(/^stock-([A-Z]{3,6})$/);
  if (stock && choiceById(id) && interval && interval !== "1d") {
    const symbol = `${stock[1]}.IS`;
    if (interval === "1h") return { symbol, interval: "1h", range: "60d", aggregate: null };
    if (interval === "4h") return { symbol, interval: "1h", range: "60d", aggregate: "4h" };
    if (interval === "1wk") return { symbol, interval: "1wk", range: "10y", aggregate: null };
    return null;
  }
  if (id === "xu100-1d") return { symbol: "XU100.IS", interval: "1d", range: "5y", aggregate: null };
  if (id === "xu100-1h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: null };
  if (id === "xu100-4h") return { symbol: "XU100.IS", interval: "1h", range: "60d", aggregate: "4h" };
  if (id === "xu100-1wk") return { symbol: "XU100.IS", interval: "1wk", range: "10y", aggregate: null };
  if (id === "ixic-1d") return { symbol: "^IXIC", interval: "1d", range: "5y", aggregate: null };
  if (stock && choiceById(id)) return { symbol: `${stock[1]}.IS`, interval: "1d", range: "2y", aggregate: null };
  return null;
}
async function loadChartBars(id, interval) {
  const spec = chartSpec(id, interval);
  if (!spec) throw new Error("Bilinmeyen grafik");
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.symbol)}`);
  url.searchParams.set("interval", spec.interval);
  url.searchParams.set("range", spec.range);
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${response.status} d\xF6nd\xFC`);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("Yahoo JSON d\xF6nd\xFCrmedi");
  }
  const bars = barsFromYahoo(body);
  if (!bars.length) throw new Error("Yahoo mum vermedi");
  return spec.aggregate === "4h" ? groupFourHours(bars) : bars;
}

// src/server/http/nodeRes.ts
function send(res, status, body) {
  res.status(status).json(body);
}

// src/server/http/chartBarsHandler.ts
function chartParams(req, request) {
  const raw = request?.url ?? req.url;
  const url = raw ? new URL(raw, "http://localhost") : null;
  const fromId = req.query?.id;
  const fromInterval = req.query?.interval;
  const id = typeof fromId === "string" ? fromId : url?.searchParams.get("id") ?? "";
  const interval = typeof fromInterval === "string" ? fromInterval : url?.searchParams.get("interval") ?? null;
  return { id, interval };
}
async function load(id, interval) {
  try {
    const bars = await loadChartBars(id, interval);
    return { status: 200, body: { source: "yahoo", bars } };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Grafik al\u0131namad\u0131";
    return { status: 502, body: { error: message } };
  }
}
async function GET(request) {
  const params = chartParams({}, request);
  const result = await load(params.id, params.interval);
  return Response.json(result.body, { status: result.status });
}
async function handler(req, res) {
  const params = chartParams(req);
  const result = await load(params.id, params.interval);
  send(res, result.status, result.body);
}
export {
  GET,
  handler as default
};

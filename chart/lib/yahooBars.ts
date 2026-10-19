import type { OhlcBar } from "./parseOhlcv";

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }> };
    }>;
  };
};

export function istanbulIso(epochSeconds: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochSeconds * 1000));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:00+03:00`;
}

function labelOf(time: string) {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]} ${match[4]}:${match[5]}`;
}

export function barsFromYahoo(body: unknown): OhlcBar[] {
  const result = (body as YahooChart).chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote) return [];
  const bars: OhlcBar[] = [];
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
      volume: volume != null && Number.isFinite(volume) ? volume : null,
    });
  }
  return bars;
}

export function groupFourHours(bars: OhlcBar[]): OhlcBar[] {
  const groups = new Map<string, OhlcBar>();
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

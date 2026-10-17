export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function dummyOhlcv(count = 240): Candle[] {
  const rand = mulberry32(101);
  const candles: Candle[] = [];
  let price = 280;
  const start = Date.UTC(2025, 0, 2);
  let day = 0;
  while (candles.length < count) {
    const date = new Date(start + day * 86_400_000);
    day += 1;
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const open = price;
    const close = Math.max(20, open + (rand() - 0.48) * 6);
    const span = 1 + rand() * 4;
    const high = Math.max(open, close) + span;
    const low = Math.max(1, Math.min(open, close) - span * (0.6 + rand()));
    const volume = Math.round(800_000 + rand() * 2_400_000 + Math.abs(close - open) * 80_000);
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dateNum = String(date.getUTCDate()).padStart(2, "0");
    candles.push({
      time: `${date.getUTCFullYear()}-${month}-${dateNum}`,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    });
    price = close;
  }
  return candles;
}

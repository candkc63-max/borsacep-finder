export type OhlcBar = {
  time: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

function labelOf(time: string) {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return time;
  return `${match[3]}.${match[2]} ${match[4]}:${match[5]}`;
}

export function parseOhlcvCsv(text: string): OhlcBar[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((name) => name.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const timeIndex = column("time");
  const openIndex = column("open");
  const highIndex = column("high");
  const lowIndex = column("low");
  const closeIndex = column("close");
  const volumeIndex = column("volume");
  if ([timeIndex, openIndex, highIndex, lowIndex, closeIndex].some((index) => index < 0)) {
    throw new Error("CSV içinde time, open, high, low, close yok");
  }
  const bars: OhlcBar[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(",");
    const open = Number(cells[openIndex]);
    const high = Number(cells[highIndex]);
    const low = Number(cells[lowIndex]);
    const close = Number(cells[closeIndex]);
    const volume = volumeIndex >= 0 ? Number(cells[volumeIndex]) : null;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    const time = cells[timeIndex];
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

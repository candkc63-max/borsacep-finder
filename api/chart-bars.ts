import { loadChartBars } from "../src/server/chartBars.js";

export default async function handler(
  req: { query?: { id?: string } },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  try {
    const bars = await loadChartBars(req.query?.id ?? "");
    res.status(200).json({ source: "yahoo", bars });
  } catch (reason) {
    res.status(502).json({ error: reason instanceof Error ? reason.message : "Grafik alınamadı" });
  }
}

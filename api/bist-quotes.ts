import { loadLiveQuotes } from "../src/server/liveQuotes";

export default async function handler(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  try {
    const stocks = await loadLiveQuotes();
    res.status(200).json({ source: "yahoo", asOf: new Date().toISOString(), stocks });
  } catch {
    res.status(502).json({ error: "Canlı veri alınamadı" });
  }
}

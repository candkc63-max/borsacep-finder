import { loadYahooBars } from "../src/server/yahooBars";

type Req = { url?: string; query?: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => { json: (body: unknown) => void } };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function handler(req: Req, res: Res) {
  const fromUrl = new URL(req.url ?? "", "http://localhost").searchParams;
  const symbol = one(req.query?.symbol) || fromUrl.get("symbol") || "";
  const interval = one(req.query?.interval) || fromUrl.get("interval") || "1d";
  const range = one(req.query?.range) || fromUrl.get("range") || "2y";
  const bist = (one(req.query?.bist) || fromUrl.get("bist") || "1") !== "0";
  try {
    const data = await loadYahooBars(symbol, interval, range, bist);
    res.status(200).json({ source: "yahoo", ...data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Mum alınamadı" });
  }
}

import { loadChartBars } from "../chartBars";
import { send, type NodeRes } from "./nodeRes";

function chartId(req: { query?: Record<string, unknown>; url?: string }, request?: Request) {
  const fromQuery = req.query?.id;
  if (typeof fromQuery === "string") return fromQuery;
  const raw = request?.url ?? req.url;
  if (!raw) return "";
  return new URL(raw, "http://localhost").searchParams.get("id") ?? "";
}

async function load(id: string) {
  try {
    const bars = await loadChartBars(id);
    return { status: 200, body: { source: "yahoo", bars } };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Grafik alınamadı";
    return { status: 502, body: { error: message } };
  }
}

export async function GET(request: Request) {
  const result = await load(chartId({}, request));
  return Response.json(result.body, { status: result.status });
}

export default async function handler(req: { query?: Record<string, unknown>; url?: string }, res: NodeRes) {
  const result = await load(chartId(req));
  send(res, result.status, result.body);
}

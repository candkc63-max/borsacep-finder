import { loadChartBars } from "../chartBars";
import { send, type NodeRes } from "./nodeRes";

function chartParams(req: { query?: Record<string, unknown>; url?: string }, request?: Request) {
  const raw = request?.url ?? req.url;
  const url = raw ? new URL(raw, "http://localhost") : null;
  const fromId = req.query?.id;
  const fromInterval = req.query?.interval;
  const id = typeof fromId === "string" ? fromId : url?.searchParams.get("id") ?? "";
  const interval = typeof fromInterval === "string" ? fromInterval : url?.searchParams.get("interval") ?? null;
  return { id, interval };
}

async function load(id: string, interval?: string | null) {
  try {
    const bars = await loadChartBars(id, interval);
    return { status: 200, body: { source: "yahoo", bars } };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Grafik alınamadı";
    return { status: 502, body: { error: message } };
  }
}

export async function GET(request: Request) {
  const params = chartParams({}, request);
  const result = await load(params.id, params.interval);
  return Response.json(result.body, { status: result.status });
}

export default async function handler(req: { query?: Record<string, unknown>; url?: string }, res: NodeRes) {
  const params = chartParams(req);
  const result = await load(params.id, params.interval);
  send(res, result.status, result.body);
}

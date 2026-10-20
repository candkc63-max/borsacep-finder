import { loadLiveQuotes } from "../liveQuotes";
import { send, type NodeRes } from "./nodeRes";

async function load() {
  try {
    const report = await loadLiveQuotes();
    return { status: 200, body: report };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Canlı veri alınamadı";
    return { status: 502, body: { error: message } };
  }
}

export async function GET() {
  const result = await load();
  return Response.json(result.body, { status: result.status });
}

export default async function handler(_req: unknown, res: NodeRes) {
  const result = await load();
  send(res, result.status, result.body);
}

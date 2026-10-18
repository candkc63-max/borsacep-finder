import { send, type NodeRes } from "./nodeRes";

const body = { ok: true };

export function GET() {
  return Response.json(body);
}

export default function handler(_req: unknown, res: NodeRes) {
  send(res, 200, body);
}

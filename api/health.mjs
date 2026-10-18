// src/server/http/nodeRes.ts
function send(res, status, body2) {
  res.status(status).json(body2);
}

// src/server/http/healthHandler.ts
var body = { ok: true };
function GET() {
  return Response.json(body);
}
function handler(_req, res) {
  send(res, 200, body);
}
export {
  GET,
  handler as default
};

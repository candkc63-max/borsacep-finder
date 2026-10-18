export type NodeRes = {
  status: (code: number) => { json: (body: unknown) => void };
};

export function send(res: NodeRes, status: number, body: unknown) {
  res.status(status).json(body);
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = ["api/health.mjs", "api/chart-bars.mjs", "api/bist-quotes.mjs"];

describe("api bundles", () => {
  it("göreli import içermez", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).toMatch(/export\s*\{/);
      expect(text).not.toMatch(/from\s+["']\.\.?[/]/);
    }
  });

  it("bilinmeyen grafik JSON hata döner", async () => {
    const mod = await import("../../api/chart-bars.mjs");
    let status = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        status = code;
        return { json(payload: unknown) { body = payload; } };
      },
    };
    await mod.default({ query: { id: "yok" } }, res);
    expect(status).toBe(502);
    expect(body).toEqual({ error: "Bilinmeyen grafik" });
    const response = await mod.GET(new Request("http://localhost/api/chart-bars?id=yok"));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Bilinmeyen grafik" });
  });

  it("sağlık ucu JSON döner", async () => {
    const mod = await import("../../api/health.mjs");
    let status = 0;
    let body: unknown;
    await mod.default({}, {
      status(code: number) {
        status = code;
        return { json(payload: unknown) { body = payload; } };
      },
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    const response = await mod.GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

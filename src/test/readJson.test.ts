import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "../../chart/lib/readJson";

describe("chart API responses", () => {
  it("returns the parsed body when the response is JSON", () => {
    expect(parseJsonResponse('{"bars":[]}', "application/json; charset=utf-8", 200)).toEqual({ bars: [] });
  });

  it("shows the server text when Vercel returns a plain invocation failure", () => {
    const text = "A server error has occurred\n\nFUNCTION_INVOCATION_FAILED\n";
    expect(() => parseJsonResponse(text, "text/plain; charset=utf-8", 500)).toThrow(/A server error has occurred/);
  });
});

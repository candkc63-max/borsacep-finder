import { describe, it, expect } from "vitest";
import { strategies } from "@/lib/indicators";

describe("strategies config", () => {
  it("should have 5 defined strategies", () => {
    expect(strategies).toHaveLength(5);
  });

  it("each strategy should have required fields", () => {
    for (const s of strategies) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.style).toBeTruthy();
    }
  });
});

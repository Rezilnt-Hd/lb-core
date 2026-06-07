import { describe, it, expect } from "vitest";
import { getNicheProfile, isContentSupported } from "../index.js";

describe("barrel exports niche registry", () => {
  it("re-exports getNicheProfile and isContentSupported", () => {
    expect(typeof getNicheProfile).toBe("function");
    expect(isContentSupported("plumbing")).toBe(true);
  });
});

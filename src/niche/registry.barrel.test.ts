import { describe, it, expect } from "vitest";
import {
  getNicheProfile,
  isContentSupported,
  listContentSupportedNiches,
} from "../index.js";

describe("barrel exports niche registry", () => {
  it("re-exports getNicheProfile and isContentSupported", () => {
    expect(typeof getNicheProfile).toBe("function");
    expect(isContentSupported("plumbing")).toBe(true);
  });

  it("re-exports listContentSupportedNiches", () => {
    expect(typeof listContentSupportedNiches).toBe("function");
    expect(listContentSupportedNiches()).toContain("plumbing");
  });
});

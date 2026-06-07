import { describe, it, expect } from "vitest";
import {
  getNicheProfile,
  isContentSupported,
  listContentSupportedNiches,
} from "./registry.js";

describe("niche registry", () => {
  it("resolves a content-supported niche with all facets", () => {
    const p = getNicheProfile("landscaping");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("outdoor");
    expect(p!.schemaType).toBe("HomeAndConstructionBusiness");
    expect(p!.context).toMatch(/lawn maintenance/i);
  });

  it("is case- and whitespace-insensitive on the niche key", () => {
    expect(getNicheProfile("  Plumbing ")!.category).toBe("emergency");
  });

  it("returns a profile WITHOUT context for a template-only niche", () => {
    const p = getNicheProfile("hvac");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("general-trade");
    expect(p!.context).toBeUndefined();
    expect(isContentSupported("hvac")).toBe(false);
  });

  it("returns null for a completely unknown niche", () => {
    expect(getNicheProfile("underwater basket weaving")).toBeNull();
    expect(isContentSupported("underwater basket weaving")).toBe(false);
  });

  it("isContentSupported is true only when context is present and non-empty", () => {
    expect(isContentSupported("landscaping")).toBe(true);
    expect(isContentSupported("plumbing")).toBe(true);
  });

  it("listContentSupportedNiches returns exactly the niches with context", () => {
    const list = listContentSupportedNiches();
    expect(list).toContain("landscaping");
    expect(list).toContain("plumbing");
    expect(list).not.toContain("hvac");
  });
});

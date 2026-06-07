import { describe, it, expect } from "vitest";
import { listContentSupportedNiches, getNicheProfile } from "./registry.js";

describe("registry invariant: content-supported ⇒ fully renderable", () => {
  it("every content-supported niche also has a category and schemaType", () => {
    for (const niche of listContentSupportedNiches()) {
      const p = getNicheProfile(niche);
      expect(p, `niche ${niche} missing profile`).not.toBeNull();
      expect(p!.category, `niche ${niche} missing category`).toBeTruthy();
      expect(p!.schemaType, `niche ${niche} missing schemaType`).toBeTruthy();
    }
  });
});

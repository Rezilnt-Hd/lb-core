import { describe, it, expect } from 'vitest';
import { listContentSupportedNiches, getNicheProfile } from '../../src/niche/registry.js';

describe('registry invariant: content-supported ⇒ fully renderable', () => {
  it('every content-supported niche resolves to a profile with a category', () => {
    for (const niche of listContentSupportedNiches()) {
      const p = getNicheProfile(niche);
      // The meaningful guard: a CONTEXT key with no CATEGORY entry returns
      // null here (getNicheProfile gates on category), so this catches a
      // porting omission like missing landscaping's category.
      expect(
        p,
        `niche ${niche} missing profile (CONTEXT key has no CATEGORY entry)`,
      ).not.toBeNull();
      expect(p!.category, `niche ${niche} missing category`).toBeTruthy();
      // schemaType is always present (defaults to 'LocalBusiness'); assert the
      // default contract holds rather than a can-never-fail truthiness check.
      expect(
        p!.schemaType,
        `niche ${niche} schemaType present (defaults to LocalBusiness)`,
      ).toBeTruthy();
    }
  });
});

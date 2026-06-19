import { describe, it, expect } from 'vitest';
import {
  getNicheProfile,
  isContentSupported,
  listContentSupportedNiches,
} from '../../src/niche/registry.js';

describe('niche registry', () => {
  it('resolves a content-supported niche with all facets', () => {
    const p = getNicheProfile('landscaping');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('outdoor');
    expect(p!.schemaType).toBe('HomeAndConstructionBusiness');
    expect(p!.context).toMatch(/lawn maintenance/i);
  });

  it('is case- and whitespace-insensitive on the niche key', () => {
    expect(getNicheProfile('  Plumbing ')!.category).toBe('emergency');
  });

  it('returns a profile WITHOUT context for a template-only niche', () => {
    const p = getNicheProfile('hvac');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('general-trade');
    expect(p!.context).toBeUndefined();
    expect(isContentSupported('hvac')).toBe(false);
  });

  it('returns null for a completely unknown niche', () => {
    expect(getNicheProfile('underwater basket weaving')).toBeNull();
    expect(isContentSupported('underwater basket weaving')).toBe(false);
  });

  it('isContentSupported is true only when context is present and non-empty', () => {
    expect(isContentSupported('landscaping')).toBe(true);
    expect(isContentSupported('plumbing')).toBe(true);
  });

  it('never leaks an empty/whitespace-only context: every CONTEXT key has real prose and getNicheProfile maps blank ⇒ undefined', () => {
    // Behavioral contract: a content-supported niche always yields non-empty,
    // trimmed prose; and a caller checking profile.context truthiness must
    // agree with isContentSupported (no '' leak that looks unsupported via
    // truthiness but reports supported, or vice-versa).
    for (const niche of listContentSupportedNiches()) {
      const p = getNicheProfile(niche);
      expect(p, `niche ${niche} missing profile`).not.toBeNull();
      // Real prose: present and non-empty after trim.
      expect(
        p!.context,
        `niche ${niche} has empty/whitespace context`,
      ).toBeTruthy();
      expect(p!.context!.trim().length).toBeGreaterThan(0);
      // truthiness of context agrees with isContentSupported.
      expect(!!p!.context).toBe(isContentSupported(niche));
    }
  });

  it('listContentSupportedNiches returns exactly the niches with context', () => {
    const list = listContentSupportedNiches();
    expect(list).toContain('landscaping');
    expect(list).toContain('plumbing');
    expect(list).not.toContain('hvac');
  });

  it('aliases plumber to the plumbing profile (same trade, no split-brain)', () => {
    const plumber = getNicheProfile('plumber');
    const plumbing = getNicheProfile('plumbing');
    expect(plumber).not.toBeNull();
    expect(plumber!.category).toBe(plumbing!.category);       // emergency
    expect(plumber!.schemaType).toBe(plumbing!.schemaType);   // Plumber
    expect(plumber!.context).toBe(plumbing!.context);         // inherits pricing context
    expect(isContentSupported('plumber')).toBe(true);
  });

  it('alias is case/whitespace-insensitive', () => {
    expect(getNicheProfile('  Plumber ')!.schemaType).toBe('Plumber');
  });

  it('listContentSupportedNiches returns normalized keys that round-trip through getNicheProfile', () => {
    for (const niche of listContentSupportedNiches()) {
      // Already-normalized: trimming + lowercasing is a no-op.
      expect(niche).toBe(niche.trim().toLowerCase());
      // Round-trip resolves and is content-supported.
      expect(
        getNicheProfile(niche),
        `niche ${niche} did not round-trip`,
      ).not.toBeNull();
      expect(isContentSupported(niche)).toBe(true);
    }
  });

  it('registers the 6 new landscaping sub-niches as content-supported children', () => {
    const subs = ['sod installation', 'artificial turf', 'drainage solutions',
                  'xeriscaping', 'mulch installation', 'outdoor living'];
    for (const s of subs) {
      const p = getNicheProfile(s);
      expect(p, `missing ${s}`).not.toBeNull();
      expect(p!.parent).toBe('landscaping');
      expect(p!.category).toBe('outdoor');
      expect(p!.schemaType).toBe('HomeAndConstructionBusiness');
      expect(p!.context, `${s} needs content context`).toBeTruthy();
      expect(p!.aliases!.length).toBeGreaterThan(0);
    }
  });

  it('registers the 4 new plumbing sub-niches as content-supported children', () => {
    const expected = {
      'gas line services': 'home-improvement',
      'slab leak repair': 'emergency',
      'sump pump services': 'emergency',
      'bathroom plumbing': 'home-improvement',
    } as const;
    for (const [s, cat] of Object.entries(expected)) {
      const p = getNicheProfile(s);
      expect(p, `missing ${s}`).not.toBeNull();
      expect(p!.parent).toBe('plumbing');
      expect(p!.category).toBe(cat);
      expect(p!.schemaType).toBe('Plumber');
      expect(p!.context, `${s} needs content context`).toBeTruthy();
    }
  });
});

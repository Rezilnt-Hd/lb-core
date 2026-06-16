import { describe, it, expect } from 'vitest';
import { normalizeKeyword, normalizeCity } from '../../src/niche/ladder.js';
import { buildLadder, KEYWORD_MODIFIERS } from '../../src/niche/ladder.js';

describe('normalizeKeyword', () => {
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normalizeKeyword('  Commercial   Landscaping  ')).toBe('commercial landscaping');
  });
  it('is idempotent', () => {
    expect(normalizeKeyword(normalizeKeyword('Drain & Sewer'))).toBe(normalizeKeyword('Drain & Sewer'));
  });
});

describe('normalizeCity', () => {
  it('joins city and state lowercased with a pipe', () => {
    expect(normalizeCity('Dallas', 'TX')).toBe('dallas|tx');
  });
  it('trims and collapses whitespace in the city', () => {
    expect(normalizeCity('  San  Antonio ', 'tx')).toBe('san antonio|tx');
  });
});

describe('buildLadder', () => {
  it('rung 0 is the canonical head term "<niche> <city>"', () => {
    const ladder = buildLadder('plumber', 'Houston', 'TX'); // "plumber" alias → "plumbing"
    expect(ladder[0]).toEqual({ rung: 0, keyword: 'plumbing houston' });
  });

  it('rungs 1..M are modifiers in the fixed order', () => {
    const ladder = buildLadder('landscaping', 'Dallas', 'TX');
    expect(ladder[1].keyword).toBe(`${KEYWORD_MODIFIERS[0]} landscaping dallas`);
    expect(ladder[KEYWORD_MODIFIERS.length].keyword).toBe(`${KEYWORD_MODIFIERS[KEYWORD_MODIFIERS.length - 1]} landscaping dallas`);
  });

  it('after modifiers come registered sub-niche slices "<subniche> <city>"', () => {
    const ladder = buildLadder('landscaping', 'Dallas', 'TX');
    const kws = ladder.map(r => r.keyword);
    expect(kws).toContain('landscape design dallas'); // a registered landscaping sub-niche
    // sub-niche rungs come strictly after the last modifier rung
    const firstSub = ladder.find(r => r.keyword === 'landscape design dallas')!;
    expect(firstSub.rung).toBeGreaterThan(KEYWORD_MODIFIERS.length);
  });

  it('is deterministic — identical input yields identical ladder', () => {
    expect(buildLadder('landscaping', 'Dallas', 'TX')).toEqual(buildLadder('landscaping', 'Dallas', 'TX'));
  });

  it('covers the worst observed collision (>=14 distinct rungs for landscaping)', () => {
    expect(buildLadder('landscaping', 'Dallas', 'TX').length).toBeGreaterThanOrEqual(14);
  });

  it('canonicalizes the niche so alias and canonical contend for the same head slot', () => {
    expect(buildLadder('plumber', 'Houston', 'TX')[0].keyword)
      .toBe(buildLadder('plumbing', 'Houston', 'TX')[0].keyword);
  });

  // ── Dedup of sub-niche slices that collide with modifier rungs ──
  // plumbing has sub-niches 'commercial plumbing' / 'residential plumbing' whose
  // slice "<sub> <city>" is byte-identical to the modifier rungs
  // "commercial plumbing <city>" / "residential plumbing <city>". The ladder must
  // not emit the same keyword at two rungs.
  it('emits no duplicate keywords for a colliding niche (plumbing)', () => {
    const keywords = buildLadder('plumbing', 'Houston', 'TX').map(r => r.keyword);
    expect(new Set(keywords).size).toBe(keywords.length);
  });

  it('re-numbers rungs sequentially 0..N-1 with no gaps after dedup', () => {
    const ladder = buildLadder('plumbing', 'Houston', 'TX');
    expect(ladder.every((r, i) => r.rung === i)).toBe(true);
  });

  it('keeps the earlier (modifier) rung and drops the later (sub-niche) duplicate', () => {
    const ladder = buildLadder('plumbing', 'Houston', 'TX');
    // rung 0 is still the head term
    expect(ladder[0]).toEqual({ rung: 0, keyword: 'plumbing houston' });
    // all 8 modifier rungs appear, in order, immediately after the head
    KEYWORD_MODIFIERS.forEach((mod, i) => {
      expect(ladder[i + 1].keyword).toBe(`${mod} plumbing houston`);
    });
    // the colliding keywords appear at their MODIFIER index, never re-appearing later
    const commercialRungs = ladder.filter(r => r.keyword === 'commercial plumbing houston');
    expect(commercialRungs).toHaveLength(1);
    expect(commercialRungs[0].rung).toBe(KEYWORD_MODIFIERS.indexOf('commercial') + 1);
    const residentialRungs = ladder.filter(r => r.keyword === 'residential plumbing houston');
    expect(residentialRungs).toHaveLength(1);
    expect(residentialRungs[0].rung).toBe(KEYWORD_MODIFIERS.indexOf('residential') + 1);
  });

  it('every modifier rung precedes any sub-niche-only slice (priority preserved)', () => {
    const ladder = buildLadder('plumbing', 'Houston', 'TX');
    const lastModifierRung = ladder
      .filter(r => KEYWORD_MODIFIERS.some(m => r.keyword === `${m} plumbing houston`))
      .reduce((max, r) => Math.max(max, r.rung), 0);
    // a sub-niche-only slice (not a "<modifier> plumbing <city>" form)
    const subSlice = ladder.find(r => r.keyword === 'drain and sewer houston')!;
    expect(subSlice.rung).toBeGreaterThan(lastModifierRung);
  });

  it('leaves a non-colliding niche (landscaping) unchanged in length and keywords', () => {
    const ladder = buildLadder('landscaping', 'Dallas', 'TX');
    const keywords = ladder.map(r => r.keyword);
    // landscaping sub-niches never start with a modifier word → no dedup happens.
    // head (1) + 8 modifiers + 6 landscaping sub-niches = 15 distinct rungs.
    expect(keywords).toHaveLength(15);
    expect(new Set(keywords).size).toBe(15);
    expect(ladder.every((r, i) => r.rung === i)).toBe(true);
  });
});

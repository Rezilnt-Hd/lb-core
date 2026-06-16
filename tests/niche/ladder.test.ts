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
});

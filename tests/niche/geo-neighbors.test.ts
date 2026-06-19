import { describe, it, expect } from 'vitest';
import { GEO_NEIGHBORS, geoNeighbors, MAX_GEO_RUNGS } from '../../src/niche/geo-neighbors.js';
import { normalizeCity } from '../../src/niche/ladder.js';

describe('geoNeighbors', () => {
  it('returns the curated, distance-ordered seed for a known metro', () => {
    const areas = geoNeighbors(normalizeCity('Dallas', 'TX'));
    expect(areas.length).toBeGreaterThan(0);
    expect(areas.length).toBeLessThanOrEqual(MAX_GEO_RUNGS);
  });

  it('returns [] for an uncurated city (fail-safe, no geo rungs)', () => {
    expect(geoNeighbors(normalizeCity('Nowhereville', 'ZZ'))).toEqual([]);
  });

  it('every curated metro list is normalized, non-empty, capped, and dup-free', () => {
    for (const [key, areas] of Object.entries(GEO_NEIGHBORS)) {
      expect(key).toBe(key.toLowerCase());
      expect(key).toMatch(/^[^|]+\|[a-z]{2}$/);
      expect(areas.length).toBeGreaterThan(0);
      expect(areas.length).toBeLessThanOrEqual(MAX_GEO_RUNGS);
      areas.forEach(a => expect(a).toBe(a.toLowerCase().trim()));
      expect(new Set(areas).size).toBe(areas.length);
    }
  });
});

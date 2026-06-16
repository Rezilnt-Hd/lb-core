import { describe, it, expect } from 'vitest';
import { normalizeKeyword, normalizeCity } from '../../src/niche/ladder.js';

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

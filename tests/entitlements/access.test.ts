import { describe, it, expect } from 'vitest';
import { Tier } from '../../src/types/lead.js';
import { getEntitlements } from '../../src/types/entitlements.js'; // P1-owned; spine does NOT redefine it
import {
  isEntitled,
  blogPostsPerWeek, canUseSmartLinking, canUseAdvancedSchema, canUseCustomDomain,
  canUseWebp, canUseFullTextSearch, canUseInfoGain,
  canUseAnomalyAlerts, canUseMonthlyReport, canUseGoogleAdsPages,
  canUseKeywordResearch, canUseCompetitorAnalysis,
} from '../../src/entitlements/access.js';

describe('getEntitlements (P1-owned) + accessor undefined-guarding', () => {
  it('getEntitlements returns the matrix row for a known tier', () => {
    expect(getEntitlements(Tier.PREMIUM).blogPostsPerWeek).toBe(3);
  });
  it('accessors default undefined/unknown tier to BASIC', () => {
    expect(blogPostsPerWeek(undefined)).toBe(1);
    expect(canUseSmartLinking(undefined)).toBe(false);
    expect(canUseSmartLinking('NOPE' as Tier)).toBe(false);
  });
});

describe('isEntitled + named accessors (Basic denied, Premium/Ultra allowed)', () => {
  it('smart linking', () => {
    expect(canUseSmartLinking(Tier.BASIC)).toBe(false);
    expect(canUseSmartLinking(Tier.PREMIUM)).toBe(true);
    expect(canUseSmartLinking(Tier.ULTRA)).toBe(true);
  });
  it('advanced schema', () => {
    expect(canUseAdvancedSchema(Tier.BASIC)).toBe(false);
    expect(canUseAdvancedSchema(Tier.PREMIUM)).toBe(true);
  });
  it('custom domain', () => {
    expect(canUseCustomDomain(Tier.BASIC)).toBe(false);
    expect(canUseCustomDomain(Tier.ULTRA)).toBe(true);
  });
  it('webp / pagefind / info-gain / alerts / report', () => {
    for (const fn of [canUseWebp, canUseFullTextSearch, canUseInfoGain, canUseAnomalyAlerts, canUseMonthlyReport]) {
      expect(fn(Tier.BASIC)).toBe(false);
      expect(fn(Tier.PREMIUM)).toBe(true);
    }
  });
  it('google ads landing pages = ULTRA only', () => {
    expect(canUseGoogleAdsPages(Tier.BASIC)).toBe(false);
    expect(canUseGoogleAdsPages(Tier.PREMIUM)).toBe(false);
    expect(canUseGoogleAdsPages(Tier.ULTRA)).toBe(true);
  });
  it('keyword research = Premium+', () => {
    expect(canUseKeywordResearch(Tier.BASIC)).toBe(false);
    expect(canUseKeywordResearch(Tier.PREMIUM)).toBe(true);
    expect(canUseKeywordResearch(Tier.ULTRA)).toBe(true);
  });
  it('competitor analysis = ULTRA only', () => {
    expect(canUseCompetitorAnalysis(Tier.BASIC)).toBe(false);
    expect(canUseCompetitorAnalysis(Tier.PREMIUM)).toBe(false);
    expect(canUseCompetitorAnalysis(Tier.ULTRA)).toBe(true);
  });
  it('blogPostsPerWeek numeric accessor', () => {
    expect(blogPostsPerWeek(Tier.BASIC)).toBe(1);
    expect(blogPostsPerWeek(Tier.ULTRA)).toBe(7);
  });
  it('generic isEntitled keys off the matrix (P1 field names)', () => {
    expect(isEntitled(Tier.PREMIUM, 'monthlyPerformanceReport')).toBe(true);
    expect(isEntitled(Tier.BASIC, 'monthlyPerformanceReport')).toBe(false);
  });
});

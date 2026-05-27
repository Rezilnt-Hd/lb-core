import { describe, it, expect } from 'vitest';
import { Tier } from '../src/types/lead.js';
import {
  TIER_ENTITLEMENTS, TIER_PRICING, TIER_CONFIG, getEntitlements,
} from '../src/types/entitlements.js';

describe('TIER_PRICING', () => {
  it('has correct monthly and annual totals', () => {
    expect(TIER_PRICING[Tier.BASIC]).toMatchObject({ monthlyTotal: 49, annualPerMonth: 39, annualTotal: 468 });
    expect(TIER_PRICING[Tier.PREMIUM]).toMatchObject({ monthlyTotal: 99, annualPerMonth: 79, annualTotal: 948 });
    expect(TIER_PRICING[Tier.ULTRA]).toMatchObject({ monthlyTotal: 149, annualPerMonth: 119, annualTotal: 1428 });
  });
  it('annual total equals whole-dollar per-month times twelve', () => {
    for (const tier of [Tier.BASIC, Tier.PREMIUM, Tier.ULTRA]) {
      expect(TIER_PRICING[tier].annualTotal).toBe(TIER_PRICING[tier].annualPerMonth * 12);
    }
  });
});

describe('TIER_ENTITLEMENTS', () => {
  it('strips Basic of premium SEO/analytics features', () => {
    const b = getEntitlements(Tier.BASIC);
    expect(b.blogPostsPerWeek).toBe(1);
    expect(b.smartInternalLinking).toBe(false);
    expect(b.advancedSchemaMarkup).toBe(false);
    expect(b.analyticsDashboard).toBe(false);
    expect(b.customDomain).toBe(false);
  });
  it('grants Premium the full SEO/analytics set', () => {
    const p = getEntitlements(Tier.PREMIUM);
    expect(p.blogPostsPerWeek).toBe(3);
    expect(p.smartInternalLinking).toBe(true);
    expect(p.advancedSchemaMarkup).toBe(true);
    expect(p.analyticsDashboard).toBe(true);
    expect(p.customDomain).toBe(true);
    expect(p.competitorAnalysis).toBe(false);
  });
  it('grants Ultra the done-for-you extras', () => {
    const u = getEntitlements(Tier.ULTRA);
    expect(u.blogPostsPerWeek).toBe(7);
    expect(u.competitorAnalysis).toBe(true);
    expect(u.proactiveAccountReview).toBe(true);
    expect(u.googleAdsLandingPages).toBe(true);
  });
});

describe('TIER_CONFIG (derived, back-compat)', () => {
  it('keeps the legacy shape sourced from the new model', () => {
    expect(TIER_CONFIG[Tier.BASIC]).toEqual({ price: 49, blogsPerWeek: 1, label: 'Basic' });
    expect(TIER_CONFIG[Tier.PREMIUM]).toEqual({ price: 99, blogsPerWeek: 3, label: 'Premium' });
    expect(TIER_CONFIG[Tier.ULTRA]).toEqual({ price: 149, blogsPerWeek: 7, label: 'Ultra' });
  });
});

import { it, expect } from 'vitest';
import * as core from '../../src/index.js';

it('re-exports the entitlement accessors + data from package root', () => {
  for (const name of ['getEntitlements', 'isEntitled', 'blogPostsPerWeek', 'canUseSmartLinking',
    'canUseAdvancedSchema', 'canUseCustomDomain', 'canUseWebp', 'canUseFullTextSearch',
    'canUseInfoGain', 'canUseAnomalyAlerts', 'canUseMonthlyReport', 'canUseGoogleAdsPages',
    'canUseKeywordResearch', 'canUseCompetitorAnalysis',
    'TIER_ENTITLEMENTS', 'updateLeadFields']) {
    expect(core).toHaveProperty(name);
  }
});

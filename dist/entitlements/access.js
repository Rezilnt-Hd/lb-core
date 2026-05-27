// P1's entitlements.ts ALREADY exports getEntitlements(tier: Tier) + TIER_ENTITLEMENTS.
// The spine does NOT redefine getEntitlements — it adds isEntitled + named accessors on top,
// guarding undefined → BASIC locally (P1's getEntitlements takes a REQUIRED Tier, no guard).
import { Tier } from '../types/lead.js';
import { TIER_ENTITLEMENTS } from '../types/entitlements.js';
/** Local undefined/unknown-tier guard → BASIC (matches scheduled-blog default). */
const resolve = (t) => TIER_ENTITLEMENTS[t ?? Tier.BASIC] ?? TIER_ENTITLEMENTS[Tier.BASIC];
/** Generic boolean gate — capability is a compile-checked key against P1's TierEntitlements. */
export function isEntitled(tier, capability) {
    return resolve(tier)[capability] === true;
}
// Accessor NAMES are P-GATE's (stable for downstream plans); KEYS are P1's actual field names.
export const blogPostsPerWeek = (t) => resolve(t).blogPostsPerWeek;
export const canUseSmartLinking = (t) => isEntitled(t, 'smartInternalLinking');
export const canUseAdvancedSchema = (t) => isEntitled(t, 'advancedSchemaMarkup');
export const canUseCustomDomain = (t) => isEntitled(t, 'customDomain');
export const canUseWebp = (t) => isEntitled(t, 'webpOptimization');
export const canUseFullTextSearch = (t) => isEntitled(t, 'fullTextSearch');
export const canUseInfoGain = (t) => isEntitled(t, 'informationGainContent');
export const canUseAnomalyAlerts = (t) => isEntitled(t, 'aiAnomalyAlerts');
export const canUseMonthlyReport = (t) => isEntitled(t, 'monthlyPerformanceReport');
export const canUseGoogleAdsPages = (t) => isEntitled(t, 'googleAdsLandingPages');
export const canUseKeywordResearch = (t) => isEntitled(t, 'keywordResearch');
export const canUseCompetitorAnalysis = (t) => isEntitled(t, 'competitorAnalysis');

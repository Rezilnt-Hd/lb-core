// P1's entitlements.ts ALREADY exports getEntitlements(tier: Tier) + TIER_ENTITLEMENTS.
// The spine does NOT redefine getEntitlements — it adds isEntitled + named accessors on top,
// guarding undefined → BASIC locally (P1's getEntitlements takes a REQUIRED Tier, no guard).
import { Tier } from '../types/lead.js';
import { TIER_ENTITLEMENTS, type TierEntitlements } from '../types/entitlements.js';

/** Local undefined/unknown-tier guard → BASIC (matches scheduled-blog default). */
const resolve = (t?: Tier): TierEntitlements => TIER_ENTITLEMENTS[t ?? Tier.BASIC] ?? TIER_ENTITLEMENTS[Tier.BASIC];

type BooleanCapability = {
  [K in keyof TierEntitlements]: TierEntitlements[K] extends boolean ? K : never
}[keyof TierEntitlements];

/** Generic boolean gate — capability is a compile-checked key against P1's TierEntitlements. */
export function isEntitled(tier: Tier | undefined, capability: BooleanCapability): boolean {
  return resolve(tier)[capability] === true;
}

// Accessor NAMES are P-GATE's (stable for downstream plans); KEYS are P1's actual field names.
export const blogPostsPerWeek     = (t?: Tier): number  => resolve(t).blogPostsPerWeek;
export const canUseSmartLinking   = (t?: Tier): boolean => isEntitled(t, 'smartInternalLinking');
export const canUseAdvancedSchema = (t?: Tier): boolean => isEntitled(t, 'advancedSchemaMarkup');
export const canUseCustomDomain   = (t?: Tier): boolean => isEntitled(t, 'customDomain');
export const canUseWebp           = (t?: Tier): boolean => isEntitled(t, 'webpOptimization');
export const canUseFullTextSearch = (t?: Tier): boolean => isEntitled(t, 'fullTextSearch');
export const canUseInfoGain       = (t?: Tier): boolean => isEntitled(t, 'informationGainContent');
export const canUseAnomalyAlerts  = (t?: Tier): boolean => isEntitled(t, 'aiAnomalyAlerts');
export const canUseMonthlyReport  = (t?: Tier): boolean => isEntitled(t, 'monthlyPerformanceReport');
export const canUseGoogleAdsPages = (t?: Tier): boolean => isEntitled(t, 'googleAdsLandingPages');

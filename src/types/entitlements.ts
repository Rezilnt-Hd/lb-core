import { Tier } from './lead.js';

/**
 * Per-tier capability matrix. Declares ALL capabilities — including ones not yet
 * built — so it is the single source of truth the P-GATE workstream enforces against.
 * P1 ships this as DATA ONLY; nothing here is enforced yet.
 */
export interface TierEntitlements {
  blogPostsPerWeek: number;
  informationGainContent: boolean;
  smartInternalLinking: boolean;
  advancedSchemaMarkup: boolean;
  analyticsDashboard: boolean;
  aiAnomalyAlerts: boolean;
  monthlyPerformanceReport: boolean;
  webpOptimization: boolean;
  fullTextSearch: boolean;
  customDomain: boolean;
  keywordResearch: boolean;
  competitorAnalysis: boolean;
  localCitationBuilding: boolean;
  // Ultra-only. Not a headcount promise — it means the personalized monthly report
  // IS the proactive review + the fastest support lane (no separate code path).
  proactiveAccountReview: boolean;
  googleAdsLandingPages: boolean;
  prioritySupport: boolean;
}

export const TIER_ENTITLEMENTS: Record<Tier, TierEntitlements> = {
  [Tier.BASIC]: {
    blogPostsPerWeek: 1,
    informationGainContent: false,
    smartInternalLinking: false,
    advancedSchemaMarkup: false,
    analyticsDashboard: false,
    aiAnomalyAlerts: false,
    monthlyPerformanceReport: false,
    webpOptimization: false,
    fullTextSearch: false,
    customDomain: false,
    keywordResearch: false,
    competitorAnalysis: false,
    localCitationBuilding: false,
    proactiveAccountReview: false,
    googleAdsLandingPages: false,
    prioritySupport: false,
  },
  [Tier.PREMIUM]: {
    blogPostsPerWeek: 3,
    informationGainContent: true,
    smartInternalLinking: true,
    advancedSchemaMarkup: true,
    analyticsDashboard: true,
    aiAnomalyAlerts: true,
    monthlyPerformanceReport: true,
    webpOptimization: true,
    fullTextSearch: true,
    customDomain: true,
    keywordResearch: true,
    competitorAnalysis: false,
    localCitationBuilding: false,
    proactiveAccountReview: false,
    googleAdsLandingPages: false,
    prioritySupport: true,
  },
  [Tier.ULTRA]: {
    blogPostsPerWeek: 7,
    informationGainContent: true,
    smartInternalLinking: true,
    advancedSchemaMarkup: true,
    analyticsDashboard: true,
    aiAnomalyAlerts: true,
    monthlyPerformanceReport: true,
    webpOptimization: true,
    fullTextSearch: true,
    customDomain: true,
    keywordResearch: true,
    competitorAnalysis: true,
    localCitationBuilding: true,
    proactiveAccountReview: true,
    googleAdsLandingPages: true,
    prioritySupport: true,
  },
};

export function getEntitlements(tier: Tier): TierEntitlements {
  return TIER_ENTITLEMENTS[tier];
}

export interface TierPricing {
  monthlyTotal: number;   // USD/mo on the monthly plan
  annualPerMonth: number; // USD/mo displayed when billed annually
  annualTotal: number;    // USD billed once per year
}

export const TIER_PRICING: Record<Tier, TierPricing> = {
  [Tier.BASIC]:   { monthlyTotal: 49,  annualPerMonth: 39,  annualTotal: 468 },
  [Tier.PREMIUM]: { monthlyTotal: 99,  annualPerMonth: 79,  annualTotal: 948 },
  [Tier.ULTRA]:   { monthlyTotal: 149, annualPerMonth: 119, annualTotal: 1428 },
};

const TIER_LABELS: Record<Tier, string> = {
  [Tier.BASIC]: 'Basic',
  [Tier.PREMIUM]: 'Premium',
  [Tier.ULTRA]: 'Ultra',
};

/**
 * Marketing / display framing ONLY. None of this is load-bearing — pricing,
 * entitlements, and P-GATE all key off the Tier enum IDs (BASIC/PREMIUM/ULTRA)
 * and the maps above, never these human-facing strings. Rename freely here to
 * re-brand the offer without touching a single price or entitlement.
 *
 * The named offer (Hormozi "category-of-one"): sold as one done-for-you local
 * lead machine at three horsepower levels, not three commodity "website tiers".
 */
export const OFFER_NAME = 'The Local Lead Engine';

/** Templatized per-niche form; `{{trade}}` fills from lead.niche (e.g. "Roofers"). */
export const OFFER_NAME_TEMPLATE = 'The Local Lead Engine for {{trade}}';

/** Magnetic subhead — the per-city keyword-claim moat nothing else can copy. */
export const OFFER_SUBHEAD = "Own {{city}} — your town's #1 keyword, locked to you";

export interface TierDisplay {
  /** Horsepower-metaphor name shown on pricing/marketing surfaces. */
  displayName: string;
  /** Legacy short label (Basic/Premium/Ultra), kept for back-compat. */
  label: string;
  /** "Most Popular" anchor badge, Premium only. */
  mostPopular: boolean;
}

/**
 * Human-facing tier presentation. IDs stay BASIC/PREMIUM/ULTRA; only these
 * display strings change. Adjusting a displayName re-brands the pricing page
 * with zero code, billing, or entitlement impact.
 */
export const TIER_DISPLAY: Record<Tier, TierDisplay> = {
  [Tier.BASIC]:   { displayName: 'Starter Engine',        label: TIER_LABELS[Tier.BASIC],   mostPopular: false },
  [Tier.PREMIUM]: { displayName: 'Growth Engine',         label: TIER_LABELS[Tier.PREMIUM], mostPopular: true  },
  [Tier.ULTRA]:   { displayName: 'Market-Leader Engine',  label: TIER_LABELS[Tier.ULTRA],   mostPopular: false },
};

/** Legacy shape, now derived from the model above so there is one source of truth. */
export const TIER_CONFIG: Record<Tier, { price: number; blogsPerWeek: number; label: string }> = {
  [Tier.BASIC]:   { price: TIER_PRICING[Tier.BASIC].monthlyTotal,   blogsPerWeek: TIER_ENTITLEMENTS[Tier.BASIC].blogPostsPerWeek,   label: TIER_LABELS[Tier.BASIC] },
  [Tier.PREMIUM]: { price: TIER_PRICING[Tier.PREMIUM].monthlyTotal, blogsPerWeek: TIER_ENTITLEMENTS[Tier.PREMIUM].blogPostsPerWeek, label: TIER_LABELS[Tier.PREMIUM] },
  [Tier.ULTRA]:   { price: TIER_PRICING[Tier.ULTRA].monthlyTotal,   blogsPerWeek: TIER_ENTITLEMENTS[Tier.ULTRA].blogPostsPerWeek,   label: TIER_LABELS[Tier.ULTRA] },
};

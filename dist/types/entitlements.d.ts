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
    proactiveAccountReview: boolean;
    googleAdsLandingPages: boolean;
    prioritySupport: boolean;
}
export declare const TIER_ENTITLEMENTS: Record<Tier, TierEntitlements>;
export declare function getEntitlements(tier: Tier): TierEntitlements;
export interface TierPricing {
    monthlyTotal: number;
    annualPerMonth: number;
    annualTotal: number;
}
export declare const TIER_PRICING: Record<Tier, TierPricing>;
/**
 * Marketing / display framing ONLY. None of this is load-bearing — pricing,
 * entitlements, and P-GATE all key off the Tier enum IDs (BASIC/PREMIUM/ULTRA)
 * and the maps above, never these human-facing strings. Rename freely here to
 * re-brand the offer without touching a single price or entitlement.
 *
 * The named offer (Hormozi "category-of-one"): sold as one done-for-you local
 * lead machine at three horsepower levels, not three commodity "website tiers".
 */
export declare const OFFER_NAME = "The Local Lead Engine";
/** Templatized per-niche form; `{{trade}}` fills from lead.niche (e.g. "Roofers"). */
export declare const OFFER_NAME_TEMPLATE = "The Local Lead Engine for {{trade}}";
/** Magnetic subhead — the per-city keyword-claim moat nothing else can copy. */
export declare const OFFER_SUBHEAD = "Own {{city}} \u2014 your town's #1 keyword, locked to you";
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
export declare const TIER_DISPLAY: Record<Tier, TierDisplay>;
/** Legacy shape, now derived from the model above so there is one source of truth. */
export declare const TIER_CONFIG: Record<Tier, {
    price: number;
    blogsPerWeek: number;
    label: string;
}>;

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
/** Legacy shape, now derived from the model above so there is one source of truth. */
export declare const TIER_CONFIG: Record<Tier, {
    price: number;
    blogsPerWeek: number;
    label: string;
}>;

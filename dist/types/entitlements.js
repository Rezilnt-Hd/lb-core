import { Tier } from './lead.js';
export const TIER_ENTITLEMENTS = {
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
export function getEntitlements(tier) {
    return TIER_ENTITLEMENTS[tier];
}
export const TIER_PRICING = {
    [Tier.BASIC]: { monthlyTotal: 49, annualPerMonth: 39, annualTotal: 468 },
    [Tier.PREMIUM]: { monthlyTotal: 99, annualPerMonth: 79, annualTotal: 948 },
    [Tier.ULTRA]: { monthlyTotal: 149, annualPerMonth: 119, annualTotal: 1428 },
};
const TIER_LABELS = {
    [Tier.BASIC]: 'Basic',
    [Tier.PREMIUM]: 'Premium',
    [Tier.ULTRA]: 'Ultra',
};
/** Legacy shape, now derived from the model above so there is one source of truth. */
export const TIER_CONFIG = {
    [Tier.BASIC]: { price: TIER_PRICING[Tier.BASIC].monthlyTotal, blogsPerWeek: TIER_ENTITLEMENTS[Tier.BASIC].blogPostsPerWeek, label: TIER_LABELS[Tier.BASIC] },
    [Tier.PREMIUM]: { price: TIER_PRICING[Tier.PREMIUM].monthlyTotal, blogsPerWeek: TIER_ENTITLEMENTS[Tier.PREMIUM].blogPostsPerWeek, label: TIER_LABELS[Tier.PREMIUM] },
    [Tier.ULTRA]: { price: TIER_PRICING[Tier.ULTRA].monthlyTotal, blogsPerWeek: TIER_ENTITLEMENTS[Tier.ULTRA].blogPostsPerWeek, label: TIER_LABELS[Tier.ULTRA] },
};

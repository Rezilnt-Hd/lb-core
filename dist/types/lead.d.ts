import type { ExistingSite } from './existing-site.js';
export declare enum Tier {
    BASIC = "BASIC",
    PREMIUM = "PREMIUM",
    ULTRA = "ULTRA"
}
export type BillingInterval = 'month' | 'year';
export declare enum LeadStatus {
    PROSPECT = "PROSPECT",
    ENRICHED = "ENRICHED",
    VERIFIED = "VERIFIED",
    SITE_BUILT = "SITE_BUILT",
    PITCHED = "PITCHED",
    PAID = "PAID",
    LIVE = "LIVE",
    SKIPPED = "SKIPPED",
    NO_CONTACT = "NO_CONTACT",
    BOUNCED = "BOUNCED",
    BUILD_FAILED = "BUILD_FAILED",
    NO_REPLY = "NO_REPLY",
    CHURNED = "CHURNED",
    OPT_OUT = "OPT_OUT"
}
export type ScoreBand = 'HOT' | 'WARM' | 'COLD';
export interface StatusTransition {
    from: LeadStatus;
    to: LeadStatus;
    timestamp: string;
    reason?: string;
}
/**
 * Reason an outreach attempt did NOT result in a PITCHED transition. Written
 * by outreach-orchestrator on every bail path; read by the stale-lead retry
 * sweeper to decide whether a parked SITE_BUILT lead should be retried or
 * left alone.
 *
 * The split between RETRY_WORTHY_REASONS and TERMINAL_REASONS is the
 * sweeper's filter source-of-truth.
 */
export type OutreachSkipReason = 'franchise-filtered' | 'niche-unmapped' | 'instantly-5xx' | 'instantly-429' | 'instantly-4xx-perma' | 'missing-required-fields' | 'dispatch-error';
export declare const RETRY_WORTHY_REASONS: readonly ["niche-unmapped", "instantly-5xx", "instantly-429", "dispatch-error"];
export declare const TERMINAL_REASONS: readonly ["franchise-filtered", "instantly-4xx-perma", "missing-required-fields"];
export interface Lead {
    pk: string;
    sk: string;
    status: LeadStatus;
    businessName: string;
    niche: string;
    city: string;
    state: string;
    phone: string;
    address: string;
    website?: string;
    ownerEmail?: string;
    ownerName?: string;
    slug: string;
    stagingUrl?: string;
    tier?: Tier;
    stripePaymentLink?: string;
    stripePriceId?: string;
    stripeCustomerId?: string;
    billingInterval?: BillingInterval;
    currentPeriodEnd?: string;
    customDomain?: string;
    brandColors?: {
        primary: string;
        secondary: string;
        accent: string;
    };
    logoUrl?: string;
    existingSite?: ExistingSite;
    /**
     * Google Places identifiers + REAL aggregate review data, captured at prospect
     * time from the Places Text Search result (lb-prospector). placeId enables the
     * build-time Place Details fetch (lb-site-builder) that pulls fresh review text
     * within Google's 30-day cache window. rating/reviewCount are the true
     * aggregate — they replace the previously-fabricated values.
     */
    placeId?: string;
    rating?: number;
    reviewCount?: number;
    /** True for businesses we own/operate (e.g. Rezilnt). Never contacted by outreach. */
    internal?: boolean;
    /**
     * businessType-derived specialization (sub-niche) resolved by resolveRefinedNiche.
     * The coarse `niche` stays the routing/campaign key; `refinedNiche` is a more
     * specific template/content signal. Consumers read `refinedNiche ?? niche`.
     */
    refinedNiche?: string;
    /** Cached per-prospect personalized opening line for first-touch outreach (Phase 3). */
    openingLine?: string;
    leadScore?: number;
    scoreBand?: ScoreBand;
    createdAt: string;
    updatedAt: string;
    statusHistory: StatusTransition[];
    /** Reason the most recent outreach attempt bailed without enrolling. Cleared on successful PITCHED transition. */
    lastOutreachSkipReason?: OutreachSkipReason;
}
export declare const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]>;

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
    CHURNED = "CHURNED"
}
export interface StatusTransition {
    from: LeadStatus;
    to: LeadStatus;
    timestamp: string;
    reason?: string;
}
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
    createdAt: string;
    updatedAt: string;
    statusHistory: StatusTransition[];
}
export declare const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]>;

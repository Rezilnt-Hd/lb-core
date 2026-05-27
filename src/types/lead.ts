export enum Tier {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ULTRA = 'ULTRA',
}

export type BillingInterval = 'month' | 'year';

export enum LeadStatus {
  PROSPECT = 'PROSPECT',
  ENRICHED = 'ENRICHED',
  VERIFIED = 'VERIFIED',
  SITE_BUILT = 'SITE_BUILT',
  PITCHED = 'PITCHED',
  PAID = 'PAID',
  LIVE = 'LIVE',
  SKIPPED = 'SKIPPED',
  NO_CONTACT = 'NO_CONTACT',
  BOUNCED = 'BOUNCED',
  BUILD_FAILED = 'BUILD_FAILED',
  NO_REPLY = 'NO_REPLY',
  CHURNED = 'CHURNED',
}

export interface StatusTransition {
  from: LeadStatus;
  to: LeadStatus;
  timestamp: string;
  reason?: string;
}

export interface Lead {
  pk: string;            // LEAD#{slug}
  sk: string;            // META
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
  currentPeriodEnd?: string; // ISO timestamp of the next renewal (from Stripe subscription)
  customDomain?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusTransition[];
}

// Valid state transitions -- anything not listed here is rejected
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.PROSPECT]:     [LeadStatus.ENRICHED, LeadStatus.SKIPPED, LeadStatus.NO_CONTACT],
  [LeadStatus.ENRICHED]:     [LeadStatus.VERIFIED, LeadStatus.NO_CONTACT],
  [LeadStatus.VERIFIED]:     [LeadStatus.SITE_BUILT, LeadStatus.BOUNCED],
  [LeadStatus.SITE_BUILT]:   [LeadStatus.PITCHED, LeadStatus.BUILD_FAILED],
  [LeadStatus.PITCHED]:      [LeadStatus.PAID, LeadStatus.NO_REPLY, LeadStatus.BOUNCED],
  [LeadStatus.PAID]:         [LeadStatus.LIVE],
  [LeadStatus.LIVE]:         [LeadStatus.CHURNED],
  [LeadStatus.SKIPPED]:      [],
  [LeadStatus.NO_CONTACT]:   [],
  [LeadStatus.BOUNCED]:      [],
  [LeadStatus.BUILD_FAILED]: [LeadStatus.SITE_BUILT],  // retry
  [LeadStatus.NO_REPLY]:     [LeadStatus.PITCHED, LeadStatus.BOUNCED],  // re-pitch, or bounced on a later step
  [LeadStatus.CHURNED]:      [],
};

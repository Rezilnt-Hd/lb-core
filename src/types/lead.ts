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
  OPT_OUT = 'OPT_OUT',
}

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
export type OutreachSkipReason =
  | 'franchise-filtered'         // terminal: lead is a franchise/corporate
  | 'niche-unmapped'             // RETRY: niche has no approved campaign yet
  | 'instantly-5xx'              // RETRY: Instantly API 5xx (transient)
  | 'instantly-429'              // RETRY: Instantly rate limit
  | 'instantly-4xx-perma'        // terminal: Instantly 401/403/404 (auth or campaign-deleted)
  | 'missing-required-fields'    // terminal: lead missing phone/email/etc.
  | 'dispatch-error';            // RETRY: network/timeout/unknown SDK error

export const RETRY_WORTHY_REASONS = [
  'niche-unmapped', 'instantly-5xx', 'instantly-429', 'dispatch-error',
] as const satisfies readonly OutreachSkipReason[];

export const TERMINAL_REASONS = [
  'franchise-filtered', 'instantly-4xx-perma', 'missing-required-fields',
] as const satisfies readonly OutreachSkipReason[];

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
  /** Reason the most recent outreach attempt bailed without enrolling. Cleared on successful PITCHED transition. */
  lastOutreachSkipReason?: OutreachSkipReason;
}

// Valid state transitions -- anything not listed here is rejected
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.PROSPECT]:     [LeadStatus.ENRICHED, LeadStatus.SKIPPED, LeadStatus.NO_CONTACT],
  [LeadStatus.ENRICHED]:     [LeadStatus.VERIFIED, LeadStatus.NO_CONTACT],
  [LeadStatus.VERIFIED]:     [LeadStatus.SITE_BUILT, LeadStatus.BOUNCED],
  [LeadStatus.SITE_BUILT]:   [LeadStatus.PITCHED, LeadStatus.BUILD_FAILED],
  [LeadStatus.PITCHED]:      [LeadStatus.PAID, LeadStatus.NO_REPLY, LeadStatus.BOUNCED, LeadStatus.OPT_OUT],
  [LeadStatus.PAID]:         [LeadStatus.LIVE],
  [LeadStatus.LIVE]:         [LeadStatus.CHURNED],
  [LeadStatus.SKIPPED]:      [],
  [LeadStatus.NO_CONTACT]:   [],
  [LeadStatus.BOUNCED]:      [],
  [LeadStatus.BUILD_FAILED]: [LeadStatus.SITE_BUILT],  // retry
  [LeadStatus.NO_REPLY]:     [LeadStatus.PITCHED, LeadStatus.BOUNCED, LeadStatus.OPT_OUT],  // re-pitch, bounce, or unsubscribe on a later step
  [LeadStatus.CHURNED]:      [],
  [LeadStatus.OPT_OUT]:      [],
};

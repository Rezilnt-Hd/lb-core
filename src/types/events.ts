import type { BillingInterval } from './lead.js';

export const EVENT_SOURCE = 'localbuilder';

export enum EventType {
  LEAD_STATUS_CHANGED = 'lead.status.changed',
  SITE_BUILT = 'site.built',
  SITE_BUILD_FAILED = 'site.build.failed',
  PAYMENT_COMPLETED = 'payment.completed',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  DOMAIN_PROVISIONED = 'domain.provisioned',
  RETENTION_SAVE_OFFER = 'retention.save.offer',
}

export interface LeadStatusChangedPayload {
  slug: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface SiteBuiltPayload {
  slug: string;
  stagingUrl: string;
  lighthouseScore: number;
}

export interface PaymentCompletedPayload {
  slug: string;
  stripeSessionId: string;
  ownerEmail: string;
  tier: string;
  interval: BillingInterval;
}

export interface DomainProvisionedPayload {
  slug: string;
  customDomain: string;
  certificateArn: string;
}

export interface RetentionSaveOfferPayload {
  slug: string;
  ownerEmail: string;
  businessName: string;
  reason: string;
  timestamp: string;
}

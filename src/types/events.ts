export const EVENT_SOURCE = 'localbuilder';

export enum EventType {
  LEAD_STATUS_CHANGED = 'lead.status.changed',
  SITE_BUILT = 'site.built',
  SITE_BUILD_FAILED = 'site.build.failed',
  PAYMENT_COMPLETED = 'payment.completed',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  DOMAIN_PROVISIONED = 'domain.provisioned',
  RETENTION_SAVE_OFFER = 'retention.save.offer',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_RECOVERED = 'payment.recovered',
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

export interface PaymentFailedPayload {
  slug: string;
  attempts: number;
  isFinal: boolean;
  timestamp: string;
}

export interface PaymentRecoveredPayload {
  slug: string;
  timestamp: string;
}

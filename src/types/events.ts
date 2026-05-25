export const EVENT_SOURCE = 'localbuilder';

export enum EventType {
  LEAD_STATUS_CHANGED = 'lead.status.changed',
  SITE_BUILT = 'site.built',
  SITE_BUILD_FAILED = 'site.build.failed',
  PAYMENT_COMPLETED = 'payment.completed',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  DOMAIN_PROVISIONED = 'domain.provisioned',
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

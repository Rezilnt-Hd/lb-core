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
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_RECOVERED = 'payment.recovered',
  ANOMALY_DETECTED = 'anomaly.detected',
  MONTHLY_REPORT_READY = 'monthly.report.ready',
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

export interface AnomalyDetectedPayload {
  slug: string;
  ownerEmail: string;
  ownerName?: string;      // for "Hi {firstName}" in the alert email (b-alerts consumer reads this)
  businessName: string;
  metric: string;          // e.g. 'keywordRank' | 'traffic'
  severity: 'info' | 'warning' | 'critical';
  summary: string;         // plain-language, outcome-first
  timestamp: string;
}

export interface MonthlyReportReadyPayload {
  slug: string;
  ownerEmail: string;
  businessName: string;
  periodMonth: string;     // 'YYYY-MM'
  timestamp: string;
}

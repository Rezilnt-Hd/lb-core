// Types
export { Lead, LeadStatus, VALID_TRANSITIONS, StatusTransition, Tier, BillingInterval } from './types/lead.js';
export {
  TierEntitlements, TIER_ENTITLEMENTS, getEntitlements,
  TierPricing, TIER_PRICING, TIER_CONFIG,
} from './types/entitlements.js';
// Entitlement ACCESSORS (P-GATE spine) — P1 owns the data/getEntitlements above; do not duplicate those here.
export {
  isEntitled,
  blogPostsPerWeek, canUseSmartLinking, canUseAdvancedSchema, canUseCustomDomain,
  canUseWebp, canUseFullTextSearch, canUseInfoGain,
  canUseAnomalyAlerts, canUseMonthlyReport, canUseGoogleAdsPages,
} from './entitlements/access.js';
export { Site, BlogPost, KeywordData, RobotsTxtConfig } from './types/site.js';
export { Template } from './types/template.js';
export {
  EVENT_SOURCE, EventType,
  LeadStatusChangedPayload, SiteBuiltPayload,
  PaymentCompletedPayload, DomainProvisionedPayload,
  RetentionSaveOfferPayload, AnomalyDetectedPayload, MonthlyReportReadyPayload,
} from './types/events.js';

// DynamoDB clients
export { createLead, getLead, transitionLead, getLeadsByStatus, countActiveLeads, updateLeadFields } from './dynamo/leads.js';
export { docClient, TABLE_NAMES } from './dynamo/client.js';

// Events
export { publishEvent } from './events/publisher.js';
export { PATTERNS } from './events/patterns.js';

// Utilities
export { generateSlug } from './utils/slug.js';
export { createLogger } from './utils/logger.js';

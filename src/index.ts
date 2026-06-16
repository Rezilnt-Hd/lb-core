// Types
export {
  Lead,
  LeadStatus,
  VALID_TRANSITIONS,
  StatusTransition,
  Tier,
  BillingInterval,
  OutreachSkipReason,
  RETRY_WORTHY_REASONS,
  TERMINAL_REASONS,
} from "./types/lead.js";
export type { ScoreBand } from "./types/lead.js";
export type { ExistingSite } from "./types/existing-site.js";
export type { KeywordClaim, ClaimStatus } from "./types/claim.js";
export {
  TierEntitlements,
  TIER_ENTITLEMENTS,
  getEntitlements,
  TierPricing,
  TIER_PRICING,
  TIER_CONFIG,
} from "./types/entitlements.js";
// Entitlement ACCESSORS (P-GATE spine) — P1 owns the data/getEntitlements above; do not duplicate those here.
export {
  isEntitled,
  blogPostsPerWeek,
  canUseSmartLinking,
  canUseAdvancedSchema,
  canUseCustomDomain,
  canUseWebp,
  canUseFullTextSearch,
  canUseInfoGain,
  canUseAnomalyAlerts,
  canUseMonthlyReport,
  canUseGoogleAdsPages,
  canUseKeywordResearch,
  canUseCompetitorAnalysis,
} from "./entitlements/access.js";
export { Site, BlogPost, KeywordData, RobotsTxtConfig } from "./types/site.js";
export { Template } from "./types/template.js";
export {
  EVENT_SOURCE,
  EventType,
  LeadStatusChangedPayload,
  SiteBuiltPayload,
  PaymentCompletedPayload,
  DomainProvisionedPayload,
  RetentionSaveOfferPayload,
  PaymentFailedPayload,
  PaymentRecoveredPayload,
  AnomalyDetectedPayload,
  MonthlyReportReadyPayload,
} from "./types/events.js";

// DynamoDB clients
export {
  createLead,
  getLead,
  transitionLead,
  getLeadsByStatus,
  countActiveLeads,
  countLeadsByStatus,
  updateLeadFields,
} from "./dynamo/leads.js";
export { docClient, TABLE_NAMES } from "./dynamo/client.js";

// Events
export { publishEvent } from "./events/publisher.js";
export { PATTERNS } from "./events/patterns.js";

// Utilities
export { generateSlug } from "./utils/slug.js";
export { createLogger } from "./utils/logger.js";
export { getSecret, invalidateSecret } from "./utils/secrets.js";

// Campaigns + approval token (Phase 2)
export * from "./types/campaign.js";
export {
  getCampaignForNiche,
  listKnownCampaignNiches,
  writePendingCampaign,
  updateCampaignApproved,
  updateCampaignStatus,
  getCampaignRow,
} from "./dynamo/campaigns.js";
export {
  signApprovalToken,
  verifyApprovalToken,
  getApprovalSecret,
} from "./services/approval-token.js";

// Niche registry — single source of truth for all niche metadata
export {
  getNicheProfile,
  getNichesByParent,
  isContentSupported,
  listContentSupportedNiches,
} from "./niche/registry.js";
export type { NicheProfile, NicheCategory } from "./niche/registry.js";
// Niche refiner — businessType → sub-niche specialization (PR-A; additive)
export { resolveRefinedNiche } from "./niche/refiner.js";
// Keyword differentiation ladder + normalizers (anti-cannibalization claim system)
export { normalizeKeyword, normalizeCity, buildLadder, KEYWORD_MODIFIERS } from "./niche/ladder.js";
export type { LadderRung } from "./niche/ladder.js";

// Bedrock adapter — provider-switch envelope + response normalization
export {
  invokeBedrock,
  detectProvider,
  buildRequestBody,
  parseResponseBody,
  supportsVision,
  _resetClient as _resetBedrockClientForTests,
} from "./bedrock/adapter.js";
export {
  BedrockAdapterError,
  type BedrockProvider,
  type BedrockMessage,
  type ContentBlock,
  type InvokeBedrockInput,
  type InvokeBedrockResult,
} from "./bedrock/types.js";
export { emitBedrockMetrics, _resetCwClient } from "./bedrock/metrics.js";

// Existing-site capture — shared Firecrawl scrape + Haiku facet extraction
export { scrapeExistingSite, captureExistingSite } from "./scrape/existing-site.js";
export type { ScrapedContent } from "./scrape/existing-site.js";

// Types
export { LeadStatus, VALID_TRANSITIONS, Tier, RETRY_WORTHY_REASONS, TERMINAL_REASONS, } from './types/lead.js';
export { TIER_ENTITLEMENTS, getEntitlements, TIER_PRICING, TIER_CONFIG, } from './types/entitlements.js';
// Entitlement ACCESSORS (P-GATE spine) — P1 owns the data/getEntitlements above; do not duplicate those here.
export { isEntitled, blogPostsPerWeek, canUseSmartLinking, canUseAdvancedSchema, canUseCustomDomain, canUseWebp, canUseFullTextSearch, canUseInfoGain, canUseAnomalyAlerts, canUseMonthlyReport, canUseGoogleAdsPages, canUseKeywordResearch, canUseCompetitorAnalysis, } from './entitlements/access.js';
export { EVENT_SOURCE, EventType, } from './types/events.js';
// DynamoDB clients
export { createLead, getLead, transitionLead, getLeadsByStatus, countActiveLeads, countLeadsByStatus, updateLeadFields } from './dynamo/leads.js';
export { docClient, TABLE_NAMES } from './dynamo/client.js';
// Events
export { publishEvent } from './events/publisher.js';
export { PATTERNS } from './events/patterns.js';
// Utilities
export { generateSlug } from './utils/slug.js';
export { createLogger } from './utils/logger.js';
export { getSecret, invalidateSecret } from './utils/secrets.js';
// Campaigns + approval token (Phase 2)
export * from './types/campaign.js';
export { getCampaignForNiche, listKnownCampaignNiches, writePendingCampaign, updateCampaignApproved, updateCampaignStatus, getCampaignRow, } from './dynamo/campaigns.js';
export { signApprovalToken, verifyApprovalToken, getApprovalSecret, } from './services/approval-token.js';
// Bedrock adapter — provider-switch envelope + response normalization
export { invokeBedrock, detectProvider, buildRequestBody, parseResponseBody, _resetClient as _resetBedrockClientForTests } from './bedrock/adapter.js';
export { BedrockAdapterError, } from './bedrock/types.js';
export { emitBedrockMetrics, _resetCwClient } from './bedrock/metrics.js';

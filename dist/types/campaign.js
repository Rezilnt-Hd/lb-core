// src/types/campaign.ts
//
// Campaign registry — per-niche Instantly campaign routing.
//
// The registry replaces the boot-time CAMPAIGN_MAP env var. Rows are written
// by the Phase 2 NicheEnablerScannerFunction as `pending_review`, flipped to
// `approved` by the CampaignApprovalWebhookFunction after the Instantly POST
// succeeds. The outreach orchestrator reads `approved` rows via a 5-min
// cached lookup to resolve a lead's niche → campaign UUID.
export {};

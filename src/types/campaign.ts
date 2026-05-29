// src/types/campaign.ts
//
// Campaign registry — per-niche Instantly campaign routing.
//
// The registry replaces the boot-time CAMPAIGN_MAP env var. Rows are written
// by the Phase 2 NicheEnablerScannerFunction as `pending_review`, flipped to
// `approved` by the CampaignApprovalWebhookFunction after the Instantly POST
// succeeds. The outreach orchestrator reads `approved` rows via a 5-min
// cached lookup to resolve a lead's niche → campaign UUID.

export type CampaignStatus = 'pending_review' | 'approved' | 'rejected';

export interface InstantlyStep {
  type: 'email';
  delay: number;
  delay_unit: 'days';
  variants: Array<{ subject: string; body: string }>;
}

export interface InstantlySequence {
  name: string;
  sequences: Array<{ steps: InstantlyStep[] }>;
}

export interface Campaign {
  pk: 'CAMPAIGN';                  // partition key, constant
  sk: string;                       // `NICHE#<niche-lowercase-spaces>`
  niche: string;                    // canonical lowercase, spaces
  status: CampaignStatus;
  generatedCopy: InstantlySequence;
  campaignUuid?: string;            // set after approval → Instantly POST
  sourceCampaignUuid: string;       // master clone source, audit
  bedrockModelId: string;           // audit; e.g. claude-sonnet-4-6
  createdAt: string;
  approvedAt?: string;
}

import { Campaign, CampaignStatus, InstantlySequence } from '../types/campaign.js';
/** Test-only — wipe the in-memory cache between vitest runs. */
export declare function _resetCampaignCacheForTests(): void;
/**
 * Resolve a lead's niche to its target Instantly campaign UUID, or null when
 * no `approved` row exists. Pending and rejected rows are treated as "no
 * mapping" — only approved rows route real outreach.
 *
 * Case/whitespace insensitive on the niche side.
 */
export declare function getCampaignForNiche(niche: string | undefined | null): Promise<string | null>;
/**
 * Return the set of niches that already have a campaign row (in ANY of
 * pending_review or approved). Used by the scanner to dedupe — we don't want
 * to regenerate copy for a niche already awaiting operator approval, nor for
 * one already live. Rejected niches are NOT in this set so they regenerate
 * on the next scan with fresh Bedrock variance.
 */
export declare function listKnownCampaignNiches(): Promise<Set<string>>;
/**
 * Return the set of niches whose campaign is `approved` (i.e. actually routes
 * real outreach — same status `getCampaignForNiche` requires). The prospector
 * uses this to scope its sweep: only niches with a live campaign are worth
 * spending SerpAPI/Hunter on, since a lead in any other niche dies at the
 * runOutreach `niche-unmapped` gate. Single GSI query on `approved` — contrast
 * listKnownCampaignNiches which unions pending_review + approved for dedupe.
 */
export declare function listApprovedCampaignNiches(): Promise<Set<string>>;
interface WritePendingInput {
    niche: string;
    generatedCopy: InstantlySequence;
    sourceCampaignUuid: string;
    bedrockModelId: string;
}
/**
 * Write a pending_review row. Conditional on `attribute_not_exists(sk)` so a
 * re-running scanner can never overwrite a row in flight (belt + suspenders
 * over the dedupe-by-listKnownCampaignNiches check). Throws
 * ConditionalCheckFailedException if the row already exists.
 */
export declare function writePendingCampaign(input: WritePendingInput): Promise<Campaign>;
/**
 * Flip a pending_review row to approved + record the Instantly campaignUuid
 * and approvedAt timestamp. Conditional on current status being
 * pending_review so a double-approval can't overwrite state.
 *
 * Also invalidates the local cache for this niche so the next
 * getCampaignForNiche call sees the new uuid immediately within this
 * Lambda container (cross-container propagation still bounded by TTL).
 */
export declare function updateCampaignApproved(niche: string, campaignUuid: string): Promise<void>;
/**
 * Flip status to rejected. No conditional — operator may reject from any
 * non-terminal state (in practice always pending_review, but if a future
 * "retry" path exists, this stays open).
 */
export declare function updateCampaignStatus(niche: string, status: CampaignStatus): Promise<void>;
/**
 * Load a single campaign row by niche (any status). Used by the webhook
 * before mutating state — needs to see pending_review rows that
 * getCampaignForNiche filters out.
 */
export declare function getCampaignRow(niche: string): Promise<Campaign | null>;
export {};

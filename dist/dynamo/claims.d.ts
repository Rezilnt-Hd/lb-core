import type { KeywordClaim } from '../types/claim.js';
/** Constant sort key. A keyword slot is a SINGLE sentinel row that every lead
 * contends for, so the conditional PutItem below is a true test-and-set mutex.
 * (Per-(slot,lead) rows would NOT be atomic: each lead's distinct sk makes
 * attribute_not_exists evaluate against a different item, so every put wins.) */
export declare const SLOT_SK = "SLOT";
export interface ClaimInput {
    pk: string;
    slug: string;
    keyword: string;
    baseKeyword: string;
    niche: string;
    city: string;
    state: string;
    rung: number;
}
/** Atomically claim a keyword slot for a lead by writing the sentinel item
 * (pk, 'SLOT'). Succeeds iff the slot is unclaimed OR previously released.
 * Returns false (ConditionalCheckFailed) when another lead actively holds it —
 * the caller advances the ladder. */
export declare function claimSlot(input: ClaimInput): Promise<boolean>;
/** The active owner of a slot, or null. A single GetItem on the sentinel. */
export declare function getActiveClaim(pk: string): Promise<KeywordClaim | null>;
/** Release every active slot a lead currently owns. Returns the count released.
 * Each Update is GUARDED on status='active' AND slug=<this lead>, so a slot
 * re-won by another lead between the query and the update is never clobbered
 * (a guarded-update ConditionalCheckFailed is skipped, not counted). */
export declare function releaseClaimsForLead(slug: string, nowIso?: string): Promise<number>;
export interface ActiveClaimRef {
    pk: string;
    slug: string;
}
/** Every currently-active claim slot via the status-index GSI, paginated.
 * Used by the reconcile rollout tool to seed slot ownership read-only. */
export declare function listActiveClaims(): Promise<ActiveClaimRef[]>;

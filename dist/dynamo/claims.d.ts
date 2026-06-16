import type { KeywordClaim } from '../types/claim.js';
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
/** Atomically claim a keyword slot for a lead. Returns false if the slot is held
 * by another active claim (ConditionalCheckFailed); the caller advances the ladder. */
export declare function claimSlot(input: ClaimInput): Promise<boolean>;
/** The single active claim on a slot, or null. */
export declare function getActiveClaim(pk: string): Promise<KeywordClaim | null>;
/** Release every active claim a lead holds. Returns the count released. */
export declare function releaseClaimsForLead(slug: string, nowIso?: string): Promise<number>;

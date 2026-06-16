export type ClaimStatus = 'active' | 'released';
/** One row in lb-keyword-claims: a lead's ownership of a differentiated keyword slot in a city. */
export interface KeywordClaim {
    pk: string;
    sk: string;
    keyword: string;
    baseKeyword: string;
    slug: string;
    niche: string;
    city: string;
    state: string;
    rung: number;
    status: ClaimStatus;
    claimedAt: string;
    releasedAt?: string;
}

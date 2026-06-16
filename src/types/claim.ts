export type ClaimStatus = 'active' | 'released';

/** One row in lb-keyword-claims: a lead's ownership of a differentiated keyword slot in a city. */
export interface KeywordClaim {
  pk: string;          // KEYWORD#<normalizedKeyword>#<normalizedCity>
  sk: string;          // LEAD#<slug>
  keyword: string;     // the differentiated keyword this lead owns (a ladder rung)
  baseKeyword: string; // the head term "<canonicalNiche> <city>"
  slug: string;
  niche: string;       // canonical niche
  city: string;
  state: string;
  rung: number;        // ladder index (0 = head term)
  status: ClaimStatus;
  claimedAt: string;   // ISO
  releasedAt?: string; // ISO, set when released
}

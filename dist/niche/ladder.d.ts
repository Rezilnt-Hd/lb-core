/** Lowercase, trim, collapse internal whitespace. The ONE normalizer used by both
 * claim-write and claim-check so a keyword maps to exactly one slot. */
export declare function normalizeKeyword(kw: string): string;
/** Stable city key for the slot pk: "<city>|<state>", normalized. */
export declare function normalizeCity(city: string, state: string): string;
export interface LadderRung {
    rung: number;
    keyword: string;
}
/** Fixed, ordered. Modifiers preserve service meaning (still the same niche), so
 * they rank ahead of sub-niche slices which narrow the meaning. */
export declare const KEYWORD_MODIFIERS: readonly ["commercial", "residential", "affordable", "luxury", "licensed", "eco-friendly", "professional", "local"];
/** Ordered list of candidate keywords for a (niche, city). A lead takes the
 * lowest-index rung not already actively claimed in that city. Deterministic.
 *
 * rung 0:            "<canonicalNiche> <city>"          (head)
 * rungs 1..M:        "<modifier> <canonicalNiche> <city>"
 * rungs M+1..K:      "<subNiche> <city>"  (registered sub-niches via taxonomy)
 *
 * A sub-niche slice can be byte-identical to a modifier rung when a registered
 * sub-niche normalizes to "<modifier> <niche>" (e.g. 'commercial plumbing' /
 * 'residential plumbing'). We dedup keeping the FIRST occurrence so head and
 * modifier rungs always win over a colliding sub-niche slice (preserving the
 * priority above), then re-number rungs sequentially so rung === array index —
 * the live claim resolver and the keyword-claim backfill both rely on that.
 */
export declare function buildLadder(niche: string, city: string, state: string): LadderRung[];

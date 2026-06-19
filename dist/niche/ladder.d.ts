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
/** Real high-intent commercial searches, applied to EVERY niche. Phrased
 * "<niche> <qualifier> <city>" (e.g. "landscaping company dallas"). */
export declare const KEYWORD_QUALIFIERS: readonly ["company", "services", "contractor", "companies"];
/** Intent prefixes: "<prefix> <niche> <city>" (e.g. "best landscaping dallas"). */
export declare const KEYWORD_INTENT_PREFIX: readonly ["best", "top"];
/** Intent suffixes: "<niche> <suffix> <city>" (e.g. "landscaping quotes dallas"). */
export declare const KEYWORD_INTENT_SUFFIX: readonly ["quotes", "estimates"];
/** Ordered list of candidate keywords for a (niche, city). A lead takes the
 * lowest-index rung not already actively claimed in that city. Deterministic.
 *
 * rung 0:            "<canonicalNiche> <city>"          (head)
 * rungs 1..M:        "<modifier> <canonicalNiche> <city>"
 * rungs M+1..K:      "<subNiche> <city>"  (registered sub-niches via taxonomy)
 * then a qualifier tier: "<canonicalNiche> <qualifier> <city>" (KEYWORD_QUALIFIERS),
 * then an intent tier: "<prefix> <canonicalNiche> <city>" (KEYWORD_INTENT_PREFIX)
 * followed by "<canonicalNiche> <suffix> <city>" (KEYWORD_INTENT_SUFFIX),
 * and finally a geographic overflow tier (lowest priority):
 * "<canonicalNiche> <nearbyArea>" for each curated in-metro area
 * (geoNeighbors) — empty for an uncurated city, so it adds zero rungs there.
 *
 * A sub-niche slice can be byte-identical to a modifier rung when a registered
 * sub-niche normalizes to "<modifier> <niche>" (e.g. 'commercial plumbing' /
 * 'residential plumbing'). We dedup keeping the FIRST occurrence so head and
 * modifier rungs always win over a colliding sub-niche slice (preserving the
 * priority above), then re-number rungs sequentially so rung === array index —
 * the live claim resolver and the keyword-claim backfill both rely on that.
 */
export declare function buildLadder(niche: string, city: string, state: string): LadderRung[];

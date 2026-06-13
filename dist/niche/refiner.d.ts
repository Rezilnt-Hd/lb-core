/**
 * Resolve a businessType-derived specialization (sub-niche) under a coarse niche.
 *
 * Contract (see 2026-06-13-niche-taxonomy-RESOLVED-data.md §classifier):
 *  1. empty businessType            → null
 *  2. coarse niche with no children → null (no Bedrock call)
 *  3. deterministic pass: across the parent's sub-niches, sort ALL aliases by
 *     length DESC; return the sub-niche key of the FIRST alias that is a substring
 *     of businessType.toLowerCase().
 *  4. Haiku fallback (only if no alias matched): ask for exactly one candidate
 *     key or NONE; map NONE/unrecognized → null.
 *
 * Best-effort: never throws. The coarse `niche` remains the routing/campaign key;
 * `refinedNiche` is purely additive (consumers read `refinedNiche ?? niche`).
 */
export declare function resolveRefinedNiche(coarseNiche: string, businessType: string | undefined | null): Promise<string | null>;

/**
 * Canonical niche registry — SINGLE SOURCE OF TRUTH for all niche metadata.
 *
 * Every consumer (lb-site-builder, lb-outreach, lb-prospector, etc.) must read
 * niche facts from this module. Duplicated niche maps in individual services are
 * to be replaced with imports from @localbuilder/core.
 *
 * Key design invariant:
 *   context absent  ⇒  niche is NOT content-supported
 *   context present ⇒  niche IS content-supported (Bedrock can generate pages)
 *
 * Callers that receive a niche without context MUST fail loud — never fall back
 * to another niche's context. That silent substitution is the exact bug this
 * registry was built to prevent (landscaping lead → plumbing website, 2026-06-07).
 */
export type NicheCategory = 'emergency' | 'home-improvement' | 'outdoor' | 'general-trade' | 'professional-services';
export interface NicheProfile {
    niche: string;
    category: NicheCategory;
    schemaType: string;
    context?: string;
    parent?: string;
    aliases?: string[];
}
/**
 * Returns the NicheProfile for the given niche string, or null if the niche
 * is not registered.
 *
 * A null return MUST be treated as a hard error by callers — never fall back
 * to another niche's data. `context` absent means content generation is not
 * supported for this niche; callers must also not fall back in that case.
 */
export declare function getNicheProfile(niche: string | undefined | null): NicheProfile | null;
/**
 * Returns the NicheProfile of every registered sub-niche whose `parent` matches
 * the given coarse niche. Parent matching is alias-aware + case/whitespace
 * insensitive. Returns [] for a coarse niche with no registered children (e.g.
 * one that has not been broken into sub-niches yet).
 */
export declare function getNichesByParent(parent: string | undefined | null): NicheProfile[];
/**
 * True iff the niche is registered AND has content context (pricing/services
 * prose that enables Bedrock page generation).
 */
export declare function isContentSupported(niche: string | undefined | null): boolean;
/**
 * Returns the canonical keys of all content-supported niches (those with
 * context defined). Use this to enumerate what can be built, not to validate
 * arbitrary input (use getNicheProfile for that).
 */
export declare function listContentSupportedNiches(): string[];

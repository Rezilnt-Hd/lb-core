import { getNicheProfile, getNichesByParent } from './registry.js';
/** Lowercase, trim, collapse internal whitespace. The ONE normalizer used by both
 * claim-write and claim-check so a keyword maps to exactly one slot. */
export function normalizeKeyword(kw) {
    return kw.toLowerCase().trim().replace(/\s+/g, ' ');
}
/** Stable city key for the slot pk: "<city>|<state>", normalized. */
export function normalizeCity(city, state) {
    return `${normalizeKeyword(city)}|${normalizeKeyword(state)}`;
}
/** Fixed, ordered. Modifiers preserve service meaning (still the same niche), so
 * they rank ahead of sub-niche slices which narrow the meaning. */
export const KEYWORD_MODIFIERS = [
    'commercial', 'residential', 'affordable', 'luxury',
    'licensed', 'eco-friendly', 'professional', 'local',
];
/** Ordered list of candidate keywords for a (niche, city). A lead takes the
 * lowest-index rung not already actively claimed in that city. Deterministic.
 *
 * rung 0:            "<canonicalNiche> <city>"          (head)
 * rungs 1..M:        "<modifier> <canonicalNiche> <city>"
 * rungs M+1..K:      "<subNiche> <city>"  (registered sub-niches via taxonomy)
 */
export function buildLadder(niche, city, state) {
    const canonical = getNicheProfile(niche)?.niche ?? normalizeKeyword(niche);
    const cityStr = normalizeKeyword(city);
    const rungs = [];
    rungs.push({ rung: 0, keyword: `${canonical} ${cityStr}` });
    for (const mod of KEYWORD_MODIFIERS) {
        rungs.push({ rung: rungs.length, keyword: `${mod} ${canonical} ${cityStr}` });
    }
    // Sub-niche slices, alphabetized by canonical key for stable order.
    const subs = getNichesByParent(canonical)
        .map(p => p.niche)
        .sort();
    for (const sub of subs) {
        rungs.push({ rung: rungs.length, keyword: `${sub} ${cityStr}` });
    }
    return rungs;
}

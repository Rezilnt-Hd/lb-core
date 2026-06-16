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
 *
 * A sub-niche slice can be byte-identical to a modifier rung when a registered
 * sub-niche normalizes to "<modifier> <niche>" (e.g. 'commercial plumbing' /
 * 'residential plumbing'). We dedup keeping the FIRST occurrence so head and
 * modifier rungs always win over a colliding sub-niche slice (preserving the
 * priority above), then re-number rungs sequentially so rung === array index —
 * the live claim resolver and the keyword-claim backfill both rely on that.
 */
export function buildLadder(niche, city, state) {
    const canonical = getNicheProfile(niche)?.niche ?? normalizeKeyword(niche);
    const cityStr = normalizeKeyword(city);
    // Wrap every rung keyword in normalizeKeyword so the ladder's keywords are
    // byte-identical to what the call site uses to build the slot pk
    // (`KEYWORD#${normalizeKeyword(keyword)}#...`). canonical/cityStr are already
    // normalized; this guards the unregistered-niche fallback (registry norm does
    // NOT collapse internal whitespace, normalizeKeyword does).
    const rung = (keyword) => normalizeKeyword(keyword);
    const candidates = [];
    candidates.push(rung(`${canonical} ${cityStr}`));
    for (const mod of KEYWORD_MODIFIERS) {
        candidates.push(rung(`${mod} ${canonical} ${cityStr}`));
    }
    // Sub-niche slices, alphabetized by canonical key for stable order.
    const subs = getNichesByParent(canonical)
        .map(p => p.niche)
        .sort();
    for (const sub of subs) {
        candidates.push(rung(`${sub} ${cityStr}`));
    }
    // Dedup on the FINAL normalized keyword, first occurrence wins, then re-number
    // rungs contiguously so rung === array index for every rung.
    const seen = new Set();
    const rungs = [];
    for (const keyword of candidates) {
        if (seen.has(keyword))
            continue;
        seen.add(keyword);
        rungs.push({ rung: rungs.length, keyword });
    }
    return rungs;
}

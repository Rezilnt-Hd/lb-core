import { getNicheProfile, getNichesByParent } from './registry.js';
import { geoNeighbors } from './geo-neighbors.js';

/** Lowercase, trim, collapse internal whitespace. The ONE normalizer used by both
 * claim-write and claim-check so a keyword maps to exactly one slot. */
export function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Stable city key for the slot pk: "<city>|<state>", normalized. */
export function normalizeCity(city: string, state: string): string {
  return `${normalizeKeyword(city)}|${normalizeKeyword(state)}`;
}

export interface LadderRung { rung: number; keyword: string; }

/** Fixed, ordered. Modifiers preserve service meaning (still the same niche), so
 * they rank ahead of sub-niche slices which narrow the meaning. */
export const KEYWORD_MODIFIERS = [
  'commercial', 'residential', 'affordable', 'luxury',
  'licensed', 'eco-friendly', 'professional', 'local',
] as const;

/** Real high-intent commercial searches, applied to EVERY niche. Phrased
 * "<niche> <qualifier> <city>" (e.g. "landscaping company dallas"). */
export const KEYWORD_QUALIFIERS = ['company', 'services', 'contractor', 'companies'] as const;

/** Intent prefixes: "<prefix> <niche> <city>" (e.g. "best landscaping dallas"). */
export const KEYWORD_INTENT_PREFIX = ['best', 'top'] as const;

/** Intent suffixes: "<niche> <suffix> <city>" (e.g. "landscaping quotes dallas"). */
export const KEYWORD_INTENT_SUFFIX = ['quotes', 'estimates'] as const;

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
export function buildLadder(niche: string, city: string, state: string): LadderRung[] {
  const canonical = getNicheProfile(niche)?.niche ?? normalizeKeyword(niche);
  const cityStr = normalizeKeyword(city);
  // Wrap every rung keyword in normalizeKeyword so the ladder's keywords are
  // byte-identical to what the call site uses to build the slot pk
  // (`KEYWORD#${normalizeKeyword(keyword)}#...`). canonical/cityStr are already
  // normalized; this guards the unregistered-niche fallback (registry norm does
  // NOT collapse internal whitespace, normalizeKeyword does).
  const rung = (keyword: string): string => normalizeKeyword(keyword);
  const candidates: string[] = [];
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
  // uniform commercial-qualifier tier (real buyer-intent searches, all niches).
  for (const q of KEYWORD_QUALIFIERS) {
    candidates.push(rung(`${canonical} ${q} ${cityStr}`));
  }
  // intent tier: prefixes ("best <niche> <city>") then suffixes ("<niche> quotes <city>").
  for (const p of KEYWORD_INTENT_PREFIX) {
    candidates.push(rung(`${p} ${canonical} ${cityStr}`));
  }
  for (const s of KEYWORD_INTENT_SUFFIX) {
    candidates.push(rung(`${canonical} ${s} ${cityStr}`));
  }
  // geographic overflow tier: "<niche> <nearbyArea>" in the lead's own city
  // pk-space. Lowest priority; empty for an uncurated city (fail-safe).
  for (const area of geoNeighbors(normalizeCity(city, state))) {
    candidates.push(rung(`${canonical} ${normalizeKeyword(area)}`));
  }
  // Dedup on the FINAL normalized keyword, first occurrence wins, then re-number
  // rungs contiguously so rung === array index for every rung.
  const seen = new Set<string>();
  const rungs: LadderRung[] = [];
  for (const keyword of candidates) {
    if (seen.has(keyword)) continue;
    seen.add(keyword);
    rungs.push({ rung: rungs.length, keyword });
  }
  return rungs;
}

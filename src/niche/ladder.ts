/** Lowercase, trim, collapse internal whitespace. The ONE normalizer used by both
 * claim-write and claim-check so a keyword maps to exactly one slot. */
export function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Stable city key for the slot pk: "<city>|<state>", normalized. */
export function normalizeCity(city: string, state: string): string {
  return `${normalizeKeyword(city)}|${normalizeKeyword(state)}`;
}

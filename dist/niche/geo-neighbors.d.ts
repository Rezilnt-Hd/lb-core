/**
 * Offline-curated metro -> nearby-area map for the geographic keyword overflow
 * tier. Keyed by normalizeCity(city, state) = "<city>|<state>". Values are
 * within-metro areas, pre-sorted by ascending centroid distance and capped at
 * MAX_GEO_RUNGS, curated offline from the public-domain US Census Gazetteer
 * "Places" file (within ~15 mi). An ABSENT key yields no geo rungs (fail-safe).
 * Static + pure so buildLadder stays deterministic and synchronous.
 */
export declare const MAX_GEO_RUNGS = 5;
export declare const GEO_NEIGHBORS: Record<string, string[]>;
/** Nearby curated areas for a normalized city key, capped at MAX_GEO_RUNGS.
 * Returns [] for an uncurated city. */
export declare function geoNeighbors(cityKey: string): string[];

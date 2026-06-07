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
function norm(niche) {
    return niche.trim().toLowerCase();
}
// ── Content context (pricing + services grounding prose) ─────────────────────
// Presence of a key here means the niche is content-supported.
// DO NOT add a key here without also adding it to CATEGORY below.
const CONTEXT = {
    'water damage restoration': `Services: water extraction ($1,500-$4,000), structural drying ($2,000-$5,000), mold remediation ($1,500-$9,000), content restoration ($500-$3,000), flood damage assessment ($200-$500), dehumidification ($800-$2,500), carpet/flooring restoration ($500-$3,000), emergency board-up ($300-$1,000), insurance claim assistance (included). Icons: 💧🌬️🦠📦🔍💨🏠🚨📋`,
    'flood remediation': `Services: emergency water extraction ($1,500-$5,000), structural drying ($2,000-$6,000), sewage cleanup ($3,000-$8,000), mold prevention treatment ($800-$3,000), flood damage repair ($2,000-$10,000), content pack-out ($500-$2,000), deodorization ($300-$1,500), moisture mapping ($200-$500), insurance documentation (included). Icons: 🌊🌬️🚿🛡️🔨📦🌸🗺️📋`,
    'sewage backup': `Services: sewage cleanup ($2,000-$8,000), sewer line inspection ($150-$500), sewer line repair ($2,500-$6,000), backflow preventer install ($300-$700), biohazard decontamination ($1,500-$5,000), drain clearing ($150-$350), sump pump install ($800-$1,800), odor elimination ($200-$800), preventive maintenance ($100-$300/visit). Icons: 🚿🔍🔧🛡️☣️🔧💧🌸🔄`,
    plumbing: `Services: emergency plumbing ($125-$350), drain cleaning ($130-$250), water heater repair ($150-$450), leak detection ($150-$350), pipe replacement ($350-$1,500), sewer line repair ($2,500-$7,000), backflow prevention ($250-$700), water filtration ($700-$2,500), bathroom remodeling ($1,500-$5,000). Icons: 🚨🔧🔥💧🔩🌳🛡️💎🏠`,
    landscaping: `lawn maintenance + mowing $40-$100 per visit, irrigation + sprinkler repair $150-$600, hardscaping + retaining walls $3,000-$15,000 per project, tree + shrub care $200-$800 per visit, seasonal cleanup $250-$700, sod + planting $1-$2 per sqft; pricing per visit / per month / per project; serves homeowners + HOAs`,
};
// ── Niche → Category ──────────────────────────────────────────────────────────
// Ported verbatim from lb-site-builder/src/services/niche-templates.ts → NICHE_CATEGORY_MAP
//
// Intentional asymmetry: a niche may appear here (template-supported) WITHOUT a
// CONTEXT entry above. That means 'template-only, not content-supported' and is
// CORRECT, not an omission — do NOT 'fix' it by inventing bogus context prose.
// Adding context is what makes a niche content-supported; absence fails loud.
const CATEGORY = {
    // Emergency Services
    plumber: 'emergency',
    plumbing: 'emergency',
    'water damage': 'emergency',
    'water damage restoration': 'emergency',
    'flood remediation': 'emergency',
    'sewage backup': 'emergency',
    locksmith: 'emergency',
    electrician: 'emergency',
    electrical: 'emergency',
    'emergency plumber': 'emergency',
    'burst pipe': 'emergency',
    'drain cleaning': 'emergency',
    // Home Improvement
    'garage door': 'home-improvement',
    'garage door repair': 'home-improvement',
    roofing: 'home-improvement',
    'roof repair': 'home-improvement',
    painting: 'home-improvement',
    'house painting': 'home-improvement',
    remodeling: 'home-improvement',
    'kitchen remodeling': 'home-improvement',
    'bathroom remodeling': 'home-improvement',
    flooring: 'home-improvement',
    windows: 'home-improvement',
    'window replacement': 'home-improvement',
    siding: 'home-improvement',
    'deck building': 'home-improvement',
    'fence installation': 'home-improvement',
    fencing: 'home-improvement',
    // Outdoor / Property
    landscaping: 'outdoor',
    'lawn care': 'outdoor',
    'tree service': 'outdoor',
    'tree trimming': 'outdoor',
    'tree removal': 'outdoor',
    'pressure washing': 'outdoor',
    'power washing': 'outdoor',
    irrigation: 'outdoor',
    'sprinkler system': 'outdoor',
    'snow removal': 'outdoor',
    'gutter cleaning': 'outdoor',
    'pool cleaning': 'outdoor',
    'pool service': 'outdoor',
    hardscaping: 'outdoor',
    // General Trade
    hvac: 'general-trade',
    'air conditioning': 'general-trade',
    heating: 'general-trade',
    'pest control': 'general-trade',
    exterminator: 'general-trade',
    cleaning: 'general-trade',
    'house cleaning': 'general-trade',
    'maid service': 'general-trade',
    moving: 'general-trade',
    'junk removal': 'general-trade',
    'appliance repair': 'general-trade',
    handyman: 'general-trade',
    restoration: 'general-trade',
};
// ── Niche → schema.org @type ──────────────────────────────────────────────────
// Ported verbatim from lb-site-builder/astro-template/src/utils/niche-templates.ts → NICHE_SCHEMA_TYPE_MAP
const SCHEMA_TYPE = {
    // Plumbing → Plumber
    plumber: 'Plumber',
    plumbing: 'Plumber',
    'emergency plumber': 'Plumber',
    'burst pipe': 'Plumber',
    'drain cleaning': 'Plumber',
    // HVAC / heating / cooling → HVACBusiness
    hvac: 'HVACBusiness',
    'air conditioning': 'HVACBusiness',
    heating: 'HVACBusiness',
    // Roofing → RoofingContractor
    roofing: 'RoofingContractor',
    'roof repair': 'RoofingContractor',
    // Electrical → Electrician
    electrician: 'Electrician',
    electrical: 'Electrician',
    // General contracting → GeneralContractor
    general: 'GeneralContractor',
    'general contractor': 'GeneralContractor',
    remodeling: 'GeneralContractor',
    'kitchen remodeling': 'GeneralContractor',
    'bathroom remodeling': 'GeneralContractor',
    // Water damage / restoration / septic / sewer → HomeAndConstructionBusiness
    'water damage': 'HomeAndConstructionBusiness',
    'water damage restoration': 'HomeAndConstructionBusiness',
    restoration: 'HomeAndConstructionBusiness',
    'flood remediation': 'HomeAndConstructionBusiness',
    'sewage backup': 'HomeAndConstructionBusiness',
    septic: 'HomeAndConstructionBusiness',
    sewer: 'HomeAndConstructionBusiness',
    // Landscape / outdoor services → HomeAndConstructionBusiness
    landscaping: 'HomeAndConstructionBusiness',
    'lawn care': 'HomeAndConstructionBusiness',
    'tree service': 'HomeAndConstructionBusiness',
    'tree trimming': 'HomeAndConstructionBusiness',
    'tree removal': 'HomeAndConstructionBusiness',
    hardscaping: 'HomeAndConstructionBusiness',
    irrigation: 'HomeAndConstructionBusiness',
    'sprinkler system': 'HomeAndConstructionBusiness',
};
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Returns the NicheProfile for the given niche string, or null if the niche
 * is not registered.
 *
 * A null return MUST be treated as a hard error by callers — never fall back
 * to another niche's data. `context` absent means content generation is not
 * supported for this niche; callers must also not fall back in that case.
 */
export function getNicheProfile(niche) {
    if (!niche)
        return null;
    const key = norm(niche);
    const category = CATEGORY[key];
    if (!category)
        return null;
    // Normalize an empty/whitespace-only context to undefined so no caller can
    // mistake '' for real content (truthiness checks and isContentSupported agree).
    const ctx = CONTEXT[key];
    return {
        niche: key,
        category,
        schemaType: SCHEMA_TYPE[key] ?? 'LocalBusiness',
        context: ctx && ctx.trim().length > 0 ? ctx : undefined,
    };
}
/**
 * True iff the niche is registered AND has content context (pricing/services
 * prose that enables Bedrock page generation).
 */
export function isContentSupported(niche) {
    const p = getNicheProfile(niche);
    return !!p?.context && p.context.trim().length > 0;
}
/**
 * Returns the canonical keys of all content-supported niches (those with
 * context defined). Use this to enumerate what can be built, not to validate
 * arbitrary input (use getNicheProfile for that).
 */
export function listContentSupportedNiches() {
    return Object.keys(CONTEXT).map(norm);
}

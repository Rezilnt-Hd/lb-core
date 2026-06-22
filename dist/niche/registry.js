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
// Niche aliases — distinct spellings of the SAME trade collapse to one canonical
// profile, so a synonym can never become an unsupported split-brain (the 'plumber'
// vs 'plumbing' gap, found in the 2026-06-06 prod audit). Add synonyms here, never
// a parallel CONTEXT/CATEGORY entry.
const ALIASES = {
    plumber: 'plumbing',
    // PR-A collapses: a colliding spelling resolves to ONE canonical sub-niche
    // (single source of truth). 'drain cleaning' and 'electrician' previously had
    // their own CATEGORY/SCHEMA rows; those rows are REMOVED below so the alias is
    // the only definition (no parallel CONTEXT/CATEGORY split-brain).
    'drain cleaning': 'drain and sewer',
    electrician: 'electrical',
    'tree trimming': 'tree service',
    'tree removal': 'tree service',
    'sprinkler system': 'irrigation',
};
// ── Content context (pricing + services grounding prose) ─────────────────────
// Presence of a key here means the niche is content-supported.
// DO NOT add a key here without also adding it to CATEGORY below.
const CONTEXT = {
    'water damage restoration': `Services: water extraction ($1,500-$4,000), structural drying ($2,000-$5,000), mold remediation ($1,500-$9,000), content restoration ($500-$3,000), flood damage assessment ($200-$500), dehumidification ($800-$2,500), carpet/flooring restoration ($500-$3,000), emergency board-up ($300-$1,000), insurance claim assistance (included). Icons: 💧🌬️🦠📦🔍💨🏠🚨📋`,
    'flood remediation': `Services: emergency water extraction ($1,500-$5,000), structural drying ($2,000-$6,000), sewage cleanup ($3,000-$8,000), mold prevention treatment ($800-$3,000), flood damage repair ($2,000-$10,000), content pack-out ($500-$2,000), deodorization ($300-$1,500), moisture mapping ($200-$500), insurance documentation (included). Icons: 🌊🌬️🚿🛡️🔨📦🌸🗺️📋`,
    'sewage backup': `Services: sewage cleanup ($2,000-$8,000), sewer line inspection ($150-$500), sewer line repair ($2,500-$6,000), backflow preventer install ($300-$700), biohazard decontamination ($1,500-$5,000), drain clearing ($150-$350), sump pump install ($800-$1,800), odor elimination ($200-$800), preventive maintenance ($100-$300/visit). Icons: 🚿🔍🔧🛡️☣️🔧💧🌸🔄`,
    plumbing: `Services: emergency plumbing ($125-$350), drain cleaning ($130-$250), water heater repair ($150-$450), leak detection ($150-$350), pipe replacement ($350-$1,500), sewer line repair ($2,500-$7,000), backflow prevention ($250-$700), water filtration ($700-$2,500), bathroom remodeling ($1,500-$5,000). Icons: 🚨🔧🔥💧🔩🌳🛡️💎🏠`,
    landscaping: `lawn maintenance + mowing $40-$100 per visit, irrigation + sprinkler repair $150-$600, hardscaping + retaining walls $3,000-$15,000 per project, tree + shrub care $200-$800 per visit, seasonal cleanup $250-$700, sod + planting $1-$2 per sqft; pricing per visit / per month / per project; serves homeowners + HOAs`,
    // ── Landscaping sub-niches (PR-A) ──────────────────────────────────────────
    'landscape design': `Services: design consultation/site analysis ($500-$2,000), conceptual design ($2,000-$8,000), full CAD plans & construction documents ($5,000-$15,000), 3D renderings ($1,500-$5,000), design-build installation ($25,000-$150,000+), master planning, planting & lighting design, project management ($150-$250/hr). Portfolio-driven; serves residential & commercial. Icons: 📐🌿🏡🖼️🌳💡🧭🛠️💼`,
    'lawn care': `Services: mowing ($40-$100/visit), fertilization & weed control ($50-$100/treatment), aeration ($80-$200), overseeding ($150-$400), seasonal cleanup ($250-$700), leaf removal ($150-$450), edging & trimming. Recurring weekly/biweekly; homeowners & HOAs. Icons: 🌱🚜🍃🌾🧹🍂✂️`,
    hardscaping: `Services: paver patios ($10-$25/sqft), retaining walls ($3,000-$15,000), outdoor kitchens ($5,000-$20,000), fire pits ($1,500-$6,000), walkways ($8-$20/sqft), driveways, stonework. Per-project; homeowners. Icons: 🧱🔥🍳🪨🚶🛤️🏗️`,
    irrigation: `Services: sprinkler system installation ($2,500-$8,000), sprinkler repair ($150-$600), drip irrigation, backflow testing ($75-$150), smart controllers, winterization ($75-$200), seasonal service. Icons: 💧🌧️🔧🚿🛡️❄️🌱`,
    'tree service': `Services: tree removal ($400-$2,000), trimming/pruning ($200-$800), stump grinding ($100-$400), emergency storm removal ($500-$3,000), arborist consultation ($100-$300), cabling & bracing. Certified-arborist signal. Icons: 🌳🪚🪵⛈️🧗🩺🔗`,
    'landscape lighting': `Services: low-voltage path & accent lighting ($80-$300/fixture), full lighting systems ($2,000-$6,000), transformer & timer install, LED retrofit ($100-$250/fixture), security/architectural lighting, smart controls. Icons: 💡🌙🔦🏡🌳🔌⭐`,
    // ── Landscaping sub-niches (Lever 2) ───────────────────────────────────────
    'sod installation': `Services: sod supply & installation ($1-$2/sqft installed), soil prep & grading ($0.50-$1.50/sqft), old lawn removal ($1-$2/sqft), warm-season sod (Bermuda/Zoysia/St. Augustine), delivery & roll-out, first-water & care plan. Per-project; homeowners & HOAs. Icons: 🌱🚜🟩💧📦🏡`,
    'artificial turf': `Services: synthetic turf installation ($8-$15/sqft installed), pet turf systems, putting greens ($20-$40/sqft), base prep & drainage, infill & seaming, turf for play areas. Low-water, low-maintenance. Per-project. Icons: 🟩🐾⛳💧🧱✨`,
    'drainage solutions': `Services: French drain installation ($1,000-$5,000), yard grading & regrading ($1,000-$3,000), channel/trench drains, dry wells, downspout extensions, catch basins, erosion control. Solves standing water & runoff. Icons: 💧🌧️🛠️⛏️🏞️🚰`,
    xeriscaping: `Services: drought-tolerant landscape design & install ($5-$20/sqft), native & succulent planting, decomposed-granite & gravel beds, drip irrigation conversion, rock features, water-wise plant selection. Low-water. Icons: 🌵🪨💧🌾☀️🌿`,
    'mulch installation': `Services: mulch supply & spreading ($35-$110/cu yd installed), bed edging ($1-$2/linear ft), weed-barrier fabric, hardwood/cedar/dyed mulch, seasonal refresh, bed cleanup & prep. Recurring/seasonal. Icons: 🪵🍂🌳🧹🛤️🌱`,
    'outdoor living': `Services: outdoor living space design & build, pergolas & pavilions ($4,000-$12,000), outdoor kitchens ($5,000-$20,000), fire features ($1,500-$6,000), pavers & seating areas, shade structures, landscape integration. Per-project. Icons: 🏡🔥🍳⛱️🪑🌿`,
    // ── Landscaping sub-niches (high-intent service rungs; pricing web-sourced 2026-06) ──
    'retaining walls': `Services: segmental block wall ($15-$40/sqft face), poured/CMU concrete wall ($30-$50/sqft), boulder & natural-stone wall ($20-$100/sqft), timber wall ($10-$40/sqft), typical installed project ($3,500-$10,000), engineered wall over 4ft w/ permits ($15,000-$25,000+), retaining wall repair ($250-$1,250), drainage & grading included. Per-project; homeowners. Icons: 🧱🪨🏗️📐💧🛠️🚜`,
    'yard cleanup': `Services: one-time yard cleanup ($200-$600), leaf removal ($190-$590), brush & debris hauling ($75-$750/trip), fall cleanup ($200-$600), spring cleanup ($100-$300), bed & storm-debris cleanup, hourly crew ($30-$80/hr); quarter-acre ($200-$500) to full-acre ($850-$1,100). One-time & seasonal; homeowners & HOAs. Icons: 🍂🧹🌿🚛🍃🪵✨`,
    // ── Plumbing sub-niches (PR-A) ─────────────────────────────────────────────
    'residential plumbing': `Services: emergency plumbing ($150-$400), faucet/fixture repair ($125-$350), toilet repair ($125-$300), drain cleaning ($150-$350), water heater repair ($150-$450), leak detection ($150-$400), garbage disposal install ($150-$400), sump pump install ($800-$1,800), bathroom remodeling ($1,500-$5,000). Icons: 🚨🔧🚽💧🔥🔍🗑️💦🏠`,
    'commercial plumbing': `Services: commercial plumbing service ($150-$250/hr), backflow testing/certification ($75-$300/device), grease trap installation ($1,400-$18,000), grease trap cleaning ($150-$500), commercial water heater service ($500-$3,000), tenant build-out plumbing ($2,000-$25,000), hydro jetting ($600-$1,400), preventive maintenance contracts ($100-$300/visit), code compliance & permits. Icons: 🏢🔧🛡️🍳🔥🚧💦🔄📋`,
    'drain and sewer': `Services: drain snaking ($100-$275), main line snaking ($150-$500), hydro jetting ($300-$600), main sewer hydro jetting ($600-$1,400), sewer camera inspection ($125-$500), sewer line repair ($2,500-$7,000), trenchless sewer replacement ($60-$250/ft), sump pump service ($300-$1,200), backwater valve install ($300-$700). Icons: 🚿🐍💦🔧📷🔍🚧🔄🛡️`,
    'water heater service': `Services: water heater repair ($150-$450), tank water heater replacement ($1,000-$2,500), tankless water heater installation ($1,800-$5,500), gas tankless ($2,700-$5,500), electric tankless ($1,800-$4,200), thermostat/element replacement ($150-$400), anode rod replacement ($150-$300), expansion tank install ($150-$350), annual flush ($100-$200). Icons: 🔥💧🔧♨️⚡🌡️🔩🛢️🧰`,
    repiping: `Services: whole-house repipe ($4,000-$15,000), PEX repipe ($0.40-$2/ft), copper repipe ($2-$8/ft), per-fixture repipe ($200-$400), water/main line replacement ($1,500-$5,000), bathroom remodel plumbing ($1,500-$5,000), kitchen remodel plumbing ($1,500-$6,000), gas line installation ($350-$2,000), fixture upgrades ($150-$500). Icons: 🔩🏠🔧🚿🛁🍳⛽💧🧰`,
    'well and water treatment': `Services: well pump repair ($200-$1,500), well pump replacement ($1,500-$4,500), pressure tank replacement ($400-$1,200), water softener installation ($800-$3,000), whole-house water filtration ($700-$2,500), well water treatment systems ($500-$10,000), reverse osmosis install ($300-$1,200), UV purification install ($300-$1,500), water testing ($100-$300). Icons: 🚰🔧💧🧂🛢️🪣💦☀️🔬`,
    // ── Plumbing sub-niches (Lever 2) ──────────────────────────────────────────
    'gas line services': `Services: gas line installation ($350-$2,000), gas line repair ($150-$750), gas leak detection ($150-$450), appliance gas hookup ($150-$600), gas line extension for grills/ranges/pool heaters, sediment trap & shutoff valve install, code compliance & permits. Icons: ⛽🔧🔥🚨🧰📋💧🔩`,
    'slab leak repair': `Services: slab leak detection ($150-$500), electronic leak location, slab leak repair ($600-$4,000), pipe re-route/re-pipe under slab ($1,500-$6,000), spot repair via tunneling, epoxy pipe lining, foundation-safe access. Emergency response. Icons: 🚨💧🏠🔍🔧🛠️🧰🔩`,
    'sump pump services': `Services: sump pump installation ($800-$1,800), sump pump replacement ($400-$1,200), battery backup pump ($300-$900), pit installation, float switch repair, discharge line service, basement flood prevention, annual testing. Icons: 💧🔋🏠🔧🚨🛠️🔌🪣`,
    'bathroom plumbing': `Services: toilet repair/replacement ($125-$500), faucet & fixture install ($125-$400), shower/tub valve replacement ($200-$700), bathroom remodel plumbing ($1,500-$5,000), vanity & sink install ($150-$500), bidet install, leak repair, drain unclogging. Icons: 🚽🚿🛁🔧💧🪞🧰🔩`,
    // ── Roofing sub-niches (PR-A) ──────────────────────────────────────────────
    'residential roofing': `Services: roof repair ($350-$1,500), asphalt shingle replacement ($4.25-$8.25/sqft; $9,000-$25,000 typical), full tear-off & re-roof ($10,500-$33,000), shingle/flashing repair ($350-$1,100/square), leak repair ($400-$1,200), ridge & ventilation ($300-$900). Icons: 🏠🔨🪜💧🧰🌬️`,
    'commercial roofing': `Services: TPO membrane install ($8-$17/sqft), EPDM rubber roofing ($3.50-$9/sqft), built-up & modified-bitumen systems, flat-roof replacement (10,000 sqft from $40,000), membrane repair & seam sealing ($500-$3,000), roof coatings & restoration. Icons: 🏢🪟🔧🧱🛢️🪜`,
    'storm damage roofing': `Services: emergency roof tarping ($400-$1,500, insurance-reimbursable), wind damage repair ($300-$5,000), hail damage repair ($1,500-$8,000), full storm replacement ($20,000+), insurance claim assistance & adjuster meetings, 24/7 emergency response, leak mitigation. Icons: ⛈️🏠🔨🧾🛡️🚨`,
    'roof inspection': `Services: standard roof inspection ($150-$600), drone roof inspection ($100-$450), roof certification ($75-$200), annual/biennial maintenance plans, real-estate transaction inspections, moisture & infrared scans, condition reports with photo documentation. Icons: 🔍🚁📋📷🏠🛰️`,
    'metal roofing': `Services: standing seam metal roof install ($10-$25/sqft; $20,000-$36,000 typical 2,000 sqft), steel panels ($10-$16/sqft), aluminum ($11-$17/sqft), copper ($20-$40/sqft), metal roof repair & re-coating, snow guards & specialty trim. Icons: 🏠🔩✨🪙🛠️❄️`,
    'gutter installation': `Services: seamless aluminum gutter install ($8-$14/linear ft), gutter replacement ($12-$61/linear ft material), gutter guard install ($6-$23/linear ft), downspout install, gutter repair & resealing, old gutter removal. Icons: 🏠🌧️🔧🪜🍂💧`,
    // ── HVAC sub-niches (PR-A) ─────────────────────────────────────────────────
    'ac installation': `Services: central AC installation ($3,300-$7,800), AC replacement ($5,750 avg 3-ton), full HVAC system replacement ($11,590-$14,100), AC load sizing & permits ($250-$500). Icons: ❄️🌬️🔧🏠📐⚡`,
    'heating and furnace': `Services: furnace replacement ($3,000-$8,500), gas furnace install ($3,800-$12,000), electric furnace install ($2,000-$7,000), furnace repair ($125-$480), boiler service. Icons: 🔥🌡️🔧🏠⚡🛠️`,
    'hvac repair': `Services: HVAC service call/diagnostic ($75-$200), AC repair ($150-$650), furnace repair ($125-$480), emergency/after-hours repair ($150-$450+), refrigerant recharge ($200-$600). Icons: 🚨🔧❄️🔥🌡️💨`,
    'hvac maintenance': `Services: HVAC tune-up ($70-$200), AC tune-up ($90-$200), seasonal maintenance plans ($150-$400/yr), filter & coil service ($75-$150), system inspection ($100-$500). Icons: 🧰🌬️🔧📋♻️✅`,
    'indoor air quality': `Services: air duct cleaning ($300-$500), whole-house air purifier install ($500-$6,000), whole-house humidifier ($400-$1,200), per-vent cleaning ($25-$50/vent), filtration & UV systems. Icons: 🌬️🦠💨🏠🔧✨`,
    'heat pump': `Services: ductless mini-split install ($2,000-$7,000/zone), single-zone system ($2,000-$6,000), air-source heat pump ($4,944/ton avg), multi-zone whole-home ($10,500+), 30% federal tax credit up to $2,000 + utility rebates. Icons: ♻️❄️🔥🔌🏠💲`,
    'commercial hvac': `Services: rooftop unit (RTU) replacement ($6,500-$25,000 small bldg), preventative maintenance ($0.15-$0.40/sqft/yr), walk-in cooler repair ($200-$4,000+), refrigeration compressor replacement ($2,000-$4,500), light-commercial install & service contracts. Icons: 🏢🌬️🔧🧊🛠️📋`,
    // ── Electrical sub-niches (PR-A) ───────────────────────────────────────────
    'residential electrical': `Services: emergency electrical repair ($150-$450), outlet/switch installation ($133-$350), 240V outlet install ($300-$800), ceiling fan & light fixture install ($150-$400), circuit/breaker repair ($150-$350), GFCI installation ($130-$300), troubleshooting/diagnostics ($75-$250/hr), smoke detector wiring ($90-$250). Icons: ⚡🔌🔧💡🔦🛡️🧰🚨`,
    'commercial electrical': `Services: commercial electrical service ($100-$150/hr), tenant build-out wiring ($3-$8/sqft), three-phase power install ($2,000-$10,000), commercial panel & subpanel upgrades ($2,500-$8,000), lighting retrofit/LED ($75-$300/fixture), data/low-voltage cabling ($1.50-$4/ft), code-compliance corrections ($500-$5,000), emergency service calls ($150-$400). Icons: 🏢⚡🔧💡🔌🛠️🧰📋`,
    'panel upgrade': `Services: 100-amp panel swap ($800-$1,500), 200-amp service upgrade ($1,500-$3,000), 300-400 amp heavy-up ($3,000-$5,000+), subpanel installation ($500-$1,000), breaker replacement ($150-$300), meter base replacement ($600-$1,500), grounding/bonding correction ($150-$500), permit & inspection. Icons: ⚡🔌🛡️🔧📦🧰📋`,
    'electrical rewiring': `Services: whole-house rewire ($10,000-$30,000 / $5-$17 sqft), partial rewire & new circuits ($2-$4/sqft), knob-and-tube replacement ($8,000-$20,000), aluminum wiring remediation ($4,000-$12,000), dedicated circuit install ($250-$900), code-correction rewiring ($1,000-$5,000), permit & inspection. Icons: ⚡🔌🧰🔧🏠🛡️📋`,
    'ev charger installation': `Services: Level 2 charger installation ($1,200-$3,000), 240V circuit & breaker ($300-$800), charger equipment supply ($400-$1,200), panel upgrade for charger load ($1,500-$3,000), detached-garage trenching/wiring ($300-$2,000), smart/Wi-Fi charger setup ($150-$400), load calculation & permit. Icons: 🔌🚗⚡🔋🧰🛠️📋🏠`,
    'generator installation': `Services: whole-house standby generator installed ($10,000-$15,000), generator unit supply ($3,000-$6,000), installation labor ($3,000-$5,000), automatic transfer switch install ($600-$1,200), gas/propane hookup & trenching ($500-$3,000), dedicated circuit & subpanel wiring ($500-$2,000), annual maintenance ($150-$400/visit). Icons: ⚡🔋🏠🔧🛠️🔌📋🚨`,
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
    plumbing: 'emergency',
    'water damage': 'emergency',
    'water damage restoration': 'emergency',
    'flood remediation': 'emergency',
    'sewage backup': 'emergency',
    locksmith: 'emergency',
    // NOTE: 'electrician' is now an ALIAS → 'electrical' (no parallel row here).
    electrical: 'emergency',
    'emergency plumber': 'emergency',
    'burst pipe': 'emergency',
    // NOTE: 'drain cleaning' is now an ALIAS → 'drain and sewer' (no parallel row here).
    // ── Plumbing sub-niches (PR-A) — buyer-intent categories ──
    'residential plumbing': 'emergency',
    'commercial plumbing': 'general-trade',
    'drain and sewer': 'emergency',
    'water heater service': 'home-improvement',
    repiping: 'home-improvement',
    'well and water treatment': 'home-improvement',
    // ── Plumbing sub-niches (Lever 2) — buyer-intent categories ──
    'gas line services': 'home-improvement',
    'slab leak repair': 'emergency',
    'sump pump services': 'emergency',
    'bathroom plumbing': 'home-improvement',
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
    // ── Landscaping sub-niche that diverges to home-improvement (PR-A) ──
    // The ONE landscaping sub-niche whose category diverges from 'outdoor':
    // routes the premium/gallery template family (Cultivators/Ambiance fix).
    'landscape design': 'home-improvement',
    // ── Roofing sub-niches (PR-A) ──
    'residential roofing': 'home-improvement',
    'commercial roofing': 'home-improvement',
    'storm damage roofing': 'emergency',
    'roof inspection': 'home-improvement',
    'metal roofing': 'home-improvement',
    'gutter installation': 'home-improvement',
    // ── HVAC sub-niches (PR-A) — buyer-intent categories ──
    'ac installation': 'home-improvement',
    'heating and furnace': 'home-improvement',
    'hvac repair': 'emergency',
    'hvac maintenance': 'general-trade',
    'indoor air quality': 'home-improvement',
    'heat pump': 'home-improvement',
    'commercial hvac': 'general-trade',
    // ── Electrical sub-niches (PR-A) — buyer-intent categories ──
    'residential electrical': 'emergency',
    'commercial electrical': 'general-trade',
    'panel upgrade': 'home-improvement',
    'electrical rewiring': 'home-improvement',
    'ev charger installation': 'home-improvement',
    'generator installation': 'home-improvement',
    // Outdoor / Property
    landscaping: 'outdoor',
    'lawn care': 'outdoor',
    'tree service': 'outdoor',
    // NOTE: 'tree trimming' / 'tree removal' are now ALIASES → 'tree service'.
    'pressure washing': 'outdoor',
    'power washing': 'outdoor',
    irrigation: 'outdoor',
    // NOTE: 'sprinkler system' is now an ALIAS → 'irrigation'.
    'snow removal': 'outdoor',
    'gutter cleaning': 'outdoor',
    'pool cleaning': 'outdoor',
    'pool service': 'outdoor',
    hardscaping: 'outdoor',
    // ── Landscaping sub-niche (PR-A) — stays outdoor ──
    'landscape lighting': 'outdoor',
    // ── Landscaping sub-niches (Lever 2) — all outdoor ──
    'sod installation': 'outdoor',
    'artificial turf': 'outdoor',
    'drainage solutions': 'outdoor',
    xeriscaping: 'outdoor',
    'mulch installation': 'outdoor',
    'outdoor living': 'outdoor',
    // ── Landscaping sub-niches (high-intent service rungs) — outdoor ──
    'retaining walls': 'outdoor',
    'yard cleanup': 'outdoor',
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
    plumbing: 'Plumber',
    'emergency plumber': 'Plumber',
    'burst pipe': 'Plumber',
    // 'drain cleaning' is now an ALIAS → 'drain and sewer' (Plumber, below).
    // ── Plumbing sub-niches (PR-A) ──
    'residential plumbing': 'Plumber',
    'commercial plumbing': 'Plumber',
    'drain and sewer': 'Plumber',
    'water heater service': 'Plumber',
    repiping: 'Plumber',
    'well and water treatment': 'Plumber',
    // ── Plumbing sub-niches (Lever 2) ──
    'gas line services': 'Plumber',
    'slab leak repair': 'Plumber',
    'sump pump services': 'Plumber',
    'bathroom plumbing': 'Plumber',
    // HVAC / heating / cooling → HVACBusiness
    hvac: 'HVACBusiness',
    'air conditioning': 'HVACBusiness',
    heating: 'HVACBusiness',
    // ── HVAC sub-niches (PR-A) ──
    'ac installation': 'HVACBusiness',
    'heating and furnace': 'HVACBusiness',
    'hvac repair': 'HVACBusiness',
    'hvac maintenance': 'HVACBusiness',
    'indoor air quality': 'HVACBusiness',
    'heat pump': 'HVACBusiness',
    'commercial hvac': 'HVACBusiness',
    // Roofing → RoofingContractor
    roofing: 'RoofingContractor',
    'roof repair': 'RoofingContractor',
    // ── Roofing sub-niches (PR-A) ──
    'residential roofing': 'RoofingContractor',
    'commercial roofing': 'RoofingContractor',
    'storm damage roofing': 'RoofingContractor',
    'roof inspection': 'RoofingContractor',
    'metal roofing': 'RoofingContractor',
    'gutter installation': 'RoofingContractor',
    // Electrical → Electrician  ('electrician' is now an ALIAS → 'electrical')
    electrical: 'Electrician',
    // ── Electrical sub-niches (PR-A) ──
    'residential electrical': 'Electrician',
    'commercial electrical': 'Electrician',
    'panel upgrade': 'Electrician',
    'electrical rewiring': 'Electrician',
    'ev charger installation': 'Electrician',
    'generator installation': 'Electrician',
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
    // 'tree trimming' / 'tree removal' are now ALIASES → 'tree service'.
    hardscaping: 'HomeAndConstructionBusiness',
    irrigation: 'HomeAndConstructionBusiness',
    // 'sprinkler system' is now an ALIAS → 'irrigation'.
    // ── Landscaping sub-niches (PR-A) ──
    'landscape design': 'HomeAndConstructionBusiness',
    'landscape lighting': 'HomeAndConstructionBusiness',
    // ── Landscaping sub-niches (Lever 2) ──
    'sod installation': 'HomeAndConstructionBusiness',
    'artificial turf': 'HomeAndConstructionBusiness',
    'drainage solutions': 'HomeAndConstructionBusiness',
    xeriscaping: 'HomeAndConstructionBusiness',
    'mulch installation': 'HomeAndConstructionBusiness',
    'outdoor living': 'HomeAndConstructionBusiness',
    // ── Landscaping sub-niches (high-intent service rungs) ──
    'retaining walls': 'HomeAndConstructionBusiness',
    'yard cleanup': 'HomeAndConstructionBusiness',
};
// ── Sub-niche → coarse parent (PR-A) ──────────────────────────────────────────
// Keyed by canonical sub-niche key. Coarse parents themselves have NO entry
// (parent === undefined). getNichesByParent() reverses this map.
const PARENT = {
    // Landscaping
    'landscape design': 'landscaping',
    'lawn care': 'landscaping',
    hardscaping: 'landscaping',
    irrigation: 'landscaping',
    'tree service': 'landscaping',
    'landscape lighting': 'landscaping',
    // Landscaping (Lever 2)
    'sod installation': 'landscaping',
    'artificial turf': 'landscaping',
    'drainage solutions': 'landscaping',
    xeriscaping: 'landscaping',
    'mulch installation': 'landscaping',
    'outdoor living': 'landscaping',
    // Landscaping (high-intent service rungs)
    'retaining walls': 'landscaping',
    'yard cleanup': 'landscaping',
    // Plumbing
    'residential plumbing': 'plumbing',
    'commercial plumbing': 'plumbing',
    'drain and sewer': 'plumbing',
    'water heater service': 'plumbing',
    repiping: 'plumbing',
    'well and water treatment': 'plumbing',
    // Plumbing (Lever 2)
    'gas line services': 'plumbing',
    'slab leak repair': 'plumbing',
    'sump pump services': 'plumbing',
    'bathroom plumbing': 'plumbing',
    // Roofing
    'residential roofing': 'roofing',
    'commercial roofing': 'roofing',
    'storm damage roofing': 'roofing',
    'roof inspection': 'roofing',
    'metal roofing': 'roofing',
    'gutter installation': 'roofing',
    // HVAC
    'ac installation': 'hvac',
    'heating and furnace': 'hvac',
    'hvac repair': 'hvac',
    'hvac maintenance': 'hvac',
    'indoor air quality': 'hvac',
    'heat pump': 'hvac',
    'commercial hvac': 'hvac',
    // Electrical
    'residential electrical': 'electrical',
    'commercial electrical': 'electrical',
    'panel upgrade': 'electrical',
    'electrical rewiring': 'electrical',
    'ev charger installation': 'electrical',
    'generator installation': 'electrical',
};
// ── Sub-niche → businessType aliases, ordered longest/most-specific FIRST ──────
// The classifier matches longest-fragment-first against businessType.toLowerCase().
// Never include a fragment generic enough to capture a sibling (e.g. bare
// 'commercial' or bare 'electrical').
const ALIASES_BY_NICHE = {
    // Landscaping
    'landscape design': ['landscape architecture', 'landscape architect', 'landscape design and build', 'landscape design-build', 'landscape design', 'outdoor living design', 'garden design', 'landscape designer'],
    'lawn care': ['lawn maintenance', 'lawn mowing', 'turf management', 'grounds maintenance', 'lawn care', 'mowing', 'lawn service'],
    // NOTE: bare 'retaining wall' MOVED to its own 'retaining walls' rung below —
    // an alias owned by two siblings makes resolveRefinedNiche order-dependent
    // (the de-split-brain pattern, cf. 'drain cleaning' → 'drain and sewer').
    hardscaping: ['outdoor kitchen', 'paver patio', 'hardscape', 'hardscaping', 'pavers', 'stonework'],
    irrigation: ['sprinkler system installation', 'sprinkler repair', 'drip irrigation', 'irrigation system', 'sprinkler', 'irrigation'],
    'tree service': ['tree removal', 'tree trimming', 'tree pruning', 'stump grinding', 'arborist', 'tree care', 'tree service'],
    'landscape lighting': ['landscape lighting installation', 'low voltage lighting', 'outdoor lighting', 'landscape lighting', 'accent lighting'],
    // Landscaping (Lever 2)
    'sod installation': ['sod installation', 'sod laying', 'lawn sodding', 'new lawn installation', 'turf laying', 'sodding'],
    'artificial turf': ['artificial turf installation', 'synthetic turf', 'artificial grass', 'synthetic grass', 'putting green installation', 'pet turf'],
    'drainage solutions': ['yard drainage', 'french drain installation', 'drainage solutions', 'french drain', 'yard grading', 'erosion control', 'standing water'],
    xeriscaping: ['xeriscaping', 'xeriscape', 'drought tolerant landscaping', 'water wise landscaping', 'desert landscaping', 'native landscaping'],
    'mulch installation': ['mulch installation', 'mulching service', 'mulch delivery', 'bed mulching', 'mulch spreading'],
    'outdoor living': ['outdoor living space', 'pergola installation', 'pavilion installation', 'outdoor living', 'fire pit installation'],
    // Landscaping (high-intent service rungs) — longest/most-specific FIRST
    'retaining walls': ['retaining wall installation', 'retaining wall replacement', 'retaining wall contractor', 'retaining wall repair', 'segmental retaining wall', 'boulder retaining wall', 'block retaining wall', 'retaining wall'],
    'yard cleanup': ['seasonal yard cleanup', 'yard waste removal', 'yard debris removal', 'spring yard cleanup', 'fall yard cleanup', 'storm debris cleanup', 'brush removal', 'leaf removal', 'yard cleanup', 'yard clean up'],
    // Plumbing
    'residential plumbing': ['residential plumbing', 'residential plumber', 'home plumbing', 'house plumbing', 'local plumber'],
    'commercial plumbing': ['commercial plumbing contractor', 'commercial plumbing', 'commercial plumber', 'industrial plumbing', 'grease trap', 'tenant improvement plumbing'],
    'drain and sewer': ['sewer line repair', 'sewer camera inspection', 'trenchless sewer', 'hydro jetting', 'main line cleaning', 'drain and sewer', 'drain cleaning', 'rooter service', 'rooter', 'clogged drain'],
    'water heater service': ['tankless water heater installation', 'tankless water heater', 'water heater installation', 'water heater replacement', 'water heater repair', 'water heater service', 'hot water heater'],
    repiping: ['whole house repipe', 'pex repipe', 'copper repipe', 'plumbing remodel', 'pipe replacement', 'repiping', 'repipe', 'new construction plumbing'],
    'well and water treatment': ['whole house water filter', 'well pump installation', 'well pump repair', 'water softener', 'water filtration', 'water treatment', 'well and water treatment', 'water purification', 'well water'],
    // Plumbing (Lever 2)
    'gas line services': ['gas line installation', 'gas line repair', 'gas leak detection', 'gas piping', 'gas line', 'gas plumber'],
    'slab leak repair': ['slab leak detection', 'slab leak repair', 'foundation leak', 'under slab leak', 'slab leak'],
    'sump pump services': ['sump pump installation', 'sump pump replacement', 'sump pump repair', 'battery backup sump pump', 'sump pump'],
    'bathroom plumbing': ['bathroom plumbing', 'toilet repair', 'bathroom remodel plumbing', 'shower valve replacement', 'bathroom fixture installation'],
    // Roofing
    // NOTE: bare 'roofer' REMOVED — it is generic across ALL roofing siblings, so
    // "commercial roofer"/"metal roofer" would mis-route to residential. Qualified
    // *-roofer fragments live on their specific sub-niche; otherwise Haiku decides.
    'residential roofing': ['residential roof replacement', 'residential roofing contractor', 'asphalt shingle roofing', 'shingle roof replacement', 'residential roofing', 're-roofing', 'reroof', 'roof repair'],
    'commercial roofing': ['commercial roofing contractor', 'commercial flat roof', 'single-ply membrane', 'modified bitumen', 'flat roof replacement', 'low-slope roofing', 'commercial roofing', 'commercial roofer', 'tpo roofing', 'epdm roofing', 'pvc roofing'],
    'storm damage roofing': ['storm damage roof repair', 'insurance restoration roofing', 'emergency roof tarp', 'roof insurance claim', 'hail damage roof', 'wind damage roof', 'storm restoration', 'roof restoration'],
    'roof inspection': ['roof inspection and certification', 'preventive roof maintenance', 'drone roof inspection', 'roof certification', 'roof maintenance plan', 'roof inspection', 'roof condition report'],
    'metal roofing': ['standing seam metal roof', 'metal roofing contractor', 'standing seam roofing', 'metal roof installation', 'steel roofing', 'aluminum roofing', 'copper roofing', 'metal roofing', 'metal roofer'],
    'gutter installation': ['seamless gutter installation', 'gutter installation and repair', 'gutter replacement', 'gutter guards', 'seamless gutters', 'gutter installation', 'downspout installation'],
    // HVAC
    'ac installation': ['air conditioning installation', 'central air installation', 'air conditioner replacement', 'ac installation', 'ac replacement', 'new air conditioner', 'ac install', 'cooling installation'],
    'heating and furnace': ['furnace installation', 'furnace replacement', 'heating installation', 'gas furnace', 'furnace repair', 'heating system', 'heating and furnace', 'furnace', 'boiler'],
    'hvac repair': ['emergency hvac repair', 'air conditioning repair', 'heating and cooling repair', '24 hour hvac', 'ac repair', 'hvac repair', 'hvac service', 'no cooling', 'no heat'],
    'hvac maintenance': ['preventative maintenance', 'seasonal tune-up', 'hvac maintenance', 'hvac tune-up', 'ac tune-up', 'furnace tune-up', 'maintenance plan', 'service plan'],
    'indoor air quality': ['indoor air quality', 'whole house air purifier', 'air filtration system', 'air duct cleaning', 'duct cleaning', 'ductwork', 'air purification', 'humidifier'],
    'heat pump': ['ductless mini split', 'mini split heat pump', 'ductless heat pump', 'air source heat pump', 'heat pump installation', 'mini split', 'heat pump', 'ductless'],
    'commercial hvac': ['commercial refrigeration', 'walk-in cooler repair', 'commercial hvac', 'rooftop unit', 'walk in freezer', 'rtu replacement', 'commercial cooling', 'light commercial hvac'],
    // Electrical
    'residential electrical': ['residential electrical contractor', 'residential electrician', 'home electrician', 'house electrician', 'residential electrical'],
    'commercial electrical': ['commercial electrical contractor', 'commercial & industrial electrician', 'industrial electrician', 'commercial electrician', 'commercial electrical', 'industrial electrical'],
    'panel upgrade': ['electrical panel upgrade', 'electrical service panel', '200 amp upgrade', 'breaker box replacement', 'service upgrade', 'panel replacement', 'panel upgrade'],
    'electrical rewiring': ['whole house rewiring', 'knob and tube replacement', 'aluminum wiring replacement', 'whole-home rewire', 'house rewiring', 'electrical rewiring', 'rewire'],
    'ev charger installation': ['ev charger installation', 'level 2 charger install', 'ev charging station', 'electric vehicle charger', 'tesla charger install', 'ev charger install', 'ev charger'],
    'generator installation': ['whole-home generator install', 'standby generator installation', 'automatic standby generator', 'backup generator install', 'whole house generator', 'generator installation', 'generator install'],
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
    const key = ALIASES[norm(niche)] ?? norm(niche);
    const category = CATEGORY[key];
    if (!category)
        return null;
    // Normalize an empty/whitespace-only context to undefined so no caller can
    // mistake '' for real content (truthiness checks and isContentSupported agree).
    const ctx = CONTEXT[key];
    const parent = PARENT[key];
    const aliases = ALIASES_BY_NICHE[key];
    return {
        niche: key,
        category,
        schemaType: SCHEMA_TYPE[key] ?? 'LocalBusiness',
        context: ctx && ctx.trim().length > 0 ? ctx : undefined,
        ...(parent ? { parent } : {}),
        ...(aliases && aliases.length > 0 ? { aliases } : {}),
    };
}
/**
 * Returns the NicheProfile of every registered sub-niche whose `parent` matches
 * the given coarse niche. Parent matching is alias-aware + case/whitespace
 * insensitive. Returns [] for a coarse niche with no registered children (e.g.
 * one that has not been broken into sub-niches yet).
 */
export function getNichesByParent(parent) {
    if (!parent)
        return [];
    const key = ALIASES[norm(parent)] ?? norm(parent);
    return Object.keys(PARENT)
        .filter((sub) => PARENT[sub] === key)
        .map((sub) => getNicheProfile(sub))
        .filter((p) => p !== null);
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

export var Tier;
(function (Tier) {
    Tier["BASIC"] = "BASIC";
    Tier["PREMIUM"] = "PREMIUM";
    Tier["ULTRA"] = "ULTRA";
})(Tier || (Tier = {}));
export const TIER_CONFIG = {
    [Tier.BASIC]: { price: 49, blogsPerWeek: 1, label: 'Basic' },
    [Tier.PREMIUM]: { price: 99, blogsPerWeek: 3, label: 'Premium' },
    [Tier.ULTRA]: { price: 149, blogsPerWeek: 7, label: 'Ultra' },
};
export var LeadStatus;
(function (LeadStatus) {
    LeadStatus["PROSPECT"] = "PROSPECT";
    LeadStatus["ENRICHED"] = "ENRICHED";
    LeadStatus["VERIFIED"] = "VERIFIED";
    LeadStatus["SITE_BUILT"] = "SITE_BUILT";
    LeadStatus["PITCHED"] = "PITCHED";
    LeadStatus["PAID"] = "PAID";
    LeadStatus["LIVE"] = "LIVE";
    LeadStatus["SKIPPED"] = "SKIPPED";
    LeadStatus["NO_CONTACT"] = "NO_CONTACT";
    LeadStatus["BOUNCED"] = "BOUNCED";
    LeadStatus["BUILD_FAILED"] = "BUILD_FAILED";
    LeadStatus["NO_REPLY"] = "NO_REPLY";
    LeadStatus["CHURNED"] = "CHURNED";
})(LeadStatus || (LeadStatus = {}));
// Valid state transitions -- anything not listed here is rejected
export const VALID_TRANSITIONS = {
    [LeadStatus.PROSPECT]: [LeadStatus.ENRICHED, LeadStatus.SKIPPED, LeadStatus.NO_CONTACT],
    [LeadStatus.ENRICHED]: [LeadStatus.VERIFIED, LeadStatus.NO_CONTACT],
    [LeadStatus.VERIFIED]: [LeadStatus.SITE_BUILT, LeadStatus.BOUNCED],
    [LeadStatus.SITE_BUILT]: [LeadStatus.PITCHED, LeadStatus.BUILD_FAILED],
    [LeadStatus.PITCHED]: [LeadStatus.PAID, LeadStatus.NO_REPLY],
    [LeadStatus.PAID]: [LeadStatus.LIVE],
    [LeadStatus.LIVE]: [LeadStatus.CHURNED],
    [LeadStatus.SKIPPED]: [],
    [LeadStatus.NO_CONTACT]: [],
    [LeadStatus.BOUNCED]: [],
    [LeadStatus.BUILD_FAILED]: [LeadStatus.SITE_BUILT], // retry
    [LeadStatus.NO_REPLY]: [LeadStatus.PITCHED], // re-pitch
    [LeadStatus.CHURNED]: [],
};

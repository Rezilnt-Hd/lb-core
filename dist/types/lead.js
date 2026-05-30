export var Tier;
(function (Tier) {
    Tier["BASIC"] = "BASIC";
    Tier["PREMIUM"] = "PREMIUM";
    Tier["ULTRA"] = "ULTRA";
})(Tier || (Tier = {}));
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
    LeadStatus["OPT_OUT"] = "OPT_OUT";
})(LeadStatus || (LeadStatus = {}));
export const RETRY_WORTHY_REASONS = [
    'niche-unmapped', 'instantly-5xx', 'instantly-429', 'dispatch-error',
];
export const TERMINAL_REASONS = [
    'franchise-filtered', 'instantly-4xx-perma', 'missing-required-fields',
];
// Valid state transitions -- anything not listed here is rejected
export const VALID_TRANSITIONS = {
    [LeadStatus.PROSPECT]: [LeadStatus.ENRICHED, LeadStatus.SKIPPED, LeadStatus.NO_CONTACT],
    [LeadStatus.ENRICHED]: [LeadStatus.VERIFIED, LeadStatus.NO_CONTACT],
    [LeadStatus.VERIFIED]: [LeadStatus.SITE_BUILT, LeadStatus.BOUNCED],
    [LeadStatus.SITE_BUILT]: [LeadStatus.PITCHED, LeadStatus.BUILD_FAILED],
    [LeadStatus.PITCHED]: [LeadStatus.PAID, LeadStatus.NO_REPLY, LeadStatus.BOUNCED, LeadStatus.OPT_OUT],
    [LeadStatus.PAID]: [LeadStatus.LIVE],
    [LeadStatus.LIVE]: [LeadStatus.CHURNED],
    [LeadStatus.SKIPPED]: [],
    [LeadStatus.NO_CONTACT]: [],
    [LeadStatus.BOUNCED]: [],
    [LeadStatus.BUILD_FAILED]: [LeadStatus.SITE_BUILT], // retry
    [LeadStatus.NO_REPLY]: [LeadStatus.PITCHED, LeadStatus.BOUNCED, LeadStatus.OPT_OUT], // re-pitch, bounce, or unsubscribe on a later step
    [LeadStatus.CHURNED]: [],
    [LeadStatus.OPT_OUT]: [],
};

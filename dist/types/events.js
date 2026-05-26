export const EVENT_SOURCE = 'localbuilder';
export var EventType;
(function (EventType) {
    EventType["LEAD_STATUS_CHANGED"] = "lead.status.changed";
    EventType["SITE_BUILT"] = "site.built";
    EventType["SITE_BUILD_FAILED"] = "site.build.failed";
    EventType["PAYMENT_COMPLETED"] = "payment.completed";
    EventType["SUBSCRIPTION_CANCELLED"] = "subscription.cancelled";
    EventType["DOMAIN_PROVISIONED"] = "domain.provisioned";
    EventType["RETENTION_SAVE_OFFER"] = "retention.save.offer";
})(EventType || (EventType = {}));

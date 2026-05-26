import { EventType, EVENT_SOURCE } from '../types/events.js';
import { LeadStatus } from '../types/lead.js';

// EventBridge rule patterns for each sub-project
export const PATTERNS = {
  // lb-keyword-engine listens for new verified leads
  keywordEngine: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.LEAD_STATUS_CHANGED],
    detail: { newStatus: [LeadStatus.VERIFIED] },
  },
  // lb-site-builder listens for keyword engine completion
  siteBuilder: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.LEAD_STATUS_CHANGED],
    detail: { newStatus: [LeadStatus.VERIFIED] },  // builds after keywords are stored in sites table
  },
  // lb-outreach listens for built sites
  outreach: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.SITE_BUILT],
  },
  // lb-fulfillment listens for payments
  fulfillment: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.PAYMENT_COMPLETED],
  },
  // lb-analytics: anomaly alert emails (Premium+)
  anomalyAlerts: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.ANOMALY_DETECTED],
  },
  // lb-analytics: monthly performance report emails (Premium+)
  monthlyReport: {
    source: [EVENT_SOURCE],
    'detail-type': [EventType.MONTHLY_REPORT_READY],
  },
};

import { EventType } from '../types/events.js';
import { LeadStatus } from '../types/lead.js';
export declare const PATTERNS: {
    keywordEngine: {
        source: string[];
        'detail-type': EventType[];
        detail: {
            newStatus: LeadStatus[];
        };
    };
    siteBuilder: {
        source: string[];
        'detail-type': EventType[];
        detail: {
            newStatus: LeadStatus[];
        };
    };
    outreach: {
        source: string[];
        'detail-type': EventType[];
    };
    fulfillment: {
        source: string[];
        'detail-type': EventType[];
    };
    anomalyAlerts: {
        source: string[];
        'detail-type': EventType[];
    };
    monthlyReport: {
        source: string[];
        'detail-type': EventType[];
    };
};

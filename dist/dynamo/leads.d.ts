import { Lead, LeadStatus } from '../types/lead.js';
interface CreateLeadInput {
    businessName: string;
    niche: string;
    city: string;
    state: string;
    phone: string;
    address: string;
    website?: string;
    ownerEmail?: string;
    ownerName?: string;
    leadScore?: number;
    scoreBand?: import('../types/lead.js').ScoreBand;
    placeId?: string;
    rating?: number;
    reviewCount?: number;
}
export declare function createLead(input: CreateLeadInput): Promise<Lead>;
export declare function getLead(slug: string): Promise<Lead | null>;
export declare function transitionLead(slug: string, fromStatus: LeadStatus, toStatus: LeadStatus, reason?: string, extraUpdates?: Record<string, unknown>): Promise<Lead>;
export declare function getLeadsByStatus(status: LeadStatus): Promise<Lead[]>;
export declare function countActiveLeads(): Promise<number>;
/**
 * Count leads in a single status. Uses the status-index GSI with Select: COUNT
 * so no items are hydrated — much cheaper than getLeadsByStatus(...).length
 * when you only need the count (e.g., prospector's cap gates).
 */
export declare function countLeadsByStatus(status: LeadStatus): Promise<number>;
/**
 * Status-neutral field writer. Unlike transitionLead, this does NOT change
 * status or enforce VALID_TRANSITIONS — use it for post-checkout edits like
 * customer-supplied customDomain / brandColors. Always refreshes updatedAt.
 */
export declare function updateLeadFields(slug: string, fields: Partial<Lead>): Promise<Lead>;
export {};

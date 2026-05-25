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
}
export declare function createLead(input: CreateLeadInput): Promise<Lead>;
export declare function getLead(slug: string): Promise<Lead | null>;
export declare function transitionLead(slug: string, fromStatus: LeadStatus, toStatus: LeadStatus, reason?: string, extraUpdates?: Record<string, unknown>): Promise<Lead>;
export declare function getLeadsByStatus(status: LeadStatus): Promise<Lead[]>;
export {};

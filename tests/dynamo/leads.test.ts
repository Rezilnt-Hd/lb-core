import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadStatus, VALID_TRANSITIONS } from '../../src/types/lead.js';
import type { Lead } from '../../src/types/lead.js';

// Mock the DynamoDB document client
vi.mock('../../src/dynamo/client.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAMES: { leads: 'test-leads' },
}));

import { docClient } from '../../src/dynamo/client.js';
import { createLead, getLead, transitionLead } from '../../src/dynamo/leads.js';

const mockSend = vi.mocked(docClient.send);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createLead', () => {
  it('creates a lead with PROSPECT status', async () => {
    mockSend.mockResolvedValueOnce({});
    const lead = await createLead({
      businessName: "Joe's Plumbing",
      niche: 'plumber',
      city: 'Miami',
      state: 'FL',
      phone: '305-555-1234',
      address: '123 Main St, Miami, FL',
    });
    expect(lead.status).toBe(LeadStatus.PROSPECT);
    expect(lead.pk).toBe('LEAD#joes-plumbing-miami');
    expect(lead.slug).toBe('joes-plumbing-miami');
    expect(lead.statusHistory).toHaveLength(1);
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe('getLead', () => {
  it('returns lead by slug', async () => {
    const mockLead: Lead = {
      pk: 'LEAD#joes-plumbing-miami',
      sk: 'META',
      status: LeadStatus.PROSPECT,
      businessName: "Joe's Plumbing",
      niche: 'plumber',
      city: 'Miami',
      state: 'FL',
      phone: '305-555-1234',
      address: '123 Main St',
      slug: 'joes-plumbing-miami',
      createdAt: '2026-05-25T00:00:00Z',
      updatedAt: '2026-05-25T00:00:00Z',
      statusHistory: [],
    };
    mockSend.mockResolvedValueOnce({ Item: mockLead });
    const result = await getLead('joes-plumbing-miami');
    expect(result?.businessName).toBe("Joe's Plumbing");
  });

  it('returns null for non-existent lead', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    const result = await getLead('nonexistent');
    expect(result).toBeNull();
  });
});

describe('transitionLead', () => {
  it('transitions from PROSPECT to ENRICHED', async () => {
    const mockLead: Lead = {
      pk: 'LEAD#test', sk: 'META', status: LeadStatus.PROSPECT,
      businessName: 'Test', niche: 'plumber', city: 'Miami', state: 'FL',
      phone: '555-1234', address: '123 Main', slug: 'test',
      createdAt: '2026-05-25T00:00:00Z', updatedAt: '2026-05-25T00:00:00Z',
      statusHistory: [],
    };
    mockSend.mockResolvedValueOnce({ Attributes: { ...mockLead, status: LeadStatus.ENRICHED } });
    const result = await transitionLead('test', LeadStatus.PROSPECT, LeadStatus.ENRICHED);
    expect(result.status).toBe(LeadStatus.ENRICHED);
  });

  it('rejects invalid transitions', async () => {
    await expect(
      transitionLead('test', LeadStatus.PROSPECT, LeadStatus.PAID)
    ).rejects.toThrow('Invalid transition: PROSPECT -> PAID');
  });
});

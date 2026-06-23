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
import { createLead, getLead, transitionLead, countLeadsByStatus } from '../../src/dynamo/leads.js';

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

describe('createLead — review fields passthrough (B1)', () => {
  it('writes placeId, rating, and reviewCount into the item when provided', async () => {
    mockSend.mockResolvedValueOnce({});
    const lead = await createLead({
      businessName: 'Acme Lawn',
      niche: 'landscaping',
      city: 'Charlotte',
      state: 'NC',
      phone: '704-555-0000',
      address: '1 Main St, Charlotte, NC',
      placeId: 'ChIJ_test_place_id',
      rating: 4.6,
      reviewCount: 87,
    });
    expect(lead.placeId).toBe('ChIJ_test_place_id');
    expect(lead.rating).toBe(4.6);
    expect(lead.reviewCount).toBe(87);
    const cmd = mockSend.mock.calls[0][0] as { input: { Item: Record<string, unknown> } };
    expect(cmd.input.Item.placeId).toBe('ChIJ_test_place_id');
    expect(cmd.input.Item.rating).toBe(4.6);
    expect(cmd.input.Item.reviewCount).toBe(87);
  });

  it('omits review fields entirely when not provided (no undefined keys)', async () => {
    mockSend.mockResolvedValueOnce({});
    const lead = await createLead({
      businessName: 'No Reviews Co',
      niche: 'plumber',
      city: 'Miami',
      state: 'FL',
      phone: '305-555-0000',
      address: '2 Main St, Miami, FL',
    });
    expect(lead.placeId).toBeUndefined();
    expect(lead.rating).toBeUndefined();
    expect(lead.reviewCount).toBeUndefined();
    const cmd = mockSend.mock.calls[0][0] as { input: { Item: Record<string, unknown> } };
    expect('placeId' in cmd.input.Item).toBe(false);
    expect('rating' in cmd.input.Item).toBe(false);
    expect('reviewCount' in cmd.input.Item).toBe(false);
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

  it('guards a lead missing statusHistory with if_not_exists (no ValidationException)', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: { pk: 'LEAD#test', sk: 'META', status: LeadStatus.ENRICHED } });
    await transitionLead('test', LeadStatus.PROSPECT, LeadStatus.ENRICHED);
    const cmd = mockSend.mock.calls[0][0] as { input: { UpdateExpression: string; ExpressionAttributeValues: Record<string, unknown> } };
    expect(cmd.input.UpdateExpression).toContain('list_append(if_not_exists(statusHistory, :empty), :transition)');
    expect(cmd.input.ExpressionAttributeValues[':empty']).toEqual([]);
  });

  it('rejects invalid transitions', async () => {
    await expect(
      transitionLead('test', LeadStatus.PROSPECT, LeadStatus.PAID)
    ).rejects.toThrow('Invalid transition: PROSPECT -> PAID');
  });

  it('allows bounce from PITCHED and NO_REPLY (outreach hard bounces)', async () => {
    mockSend.mockResolvedValue({ Attributes: { pk: 'LEAD#test', sk: 'META', status: LeadStatus.BOUNCED } });
    await expect(transitionLead('test', LeadStatus.PITCHED, LeadStatus.BOUNCED)).resolves.toBeDefined();
    await expect(transitionLead('test', LeadStatus.NO_REPLY, LeadStatus.BOUNCED)).resolves.toBeDefined();
    expect(VALID_TRANSITIONS[LeadStatus.PITCHED]).toContain(LeadStatus.BOUNCED);
    expect(VALID_TRANSITIONS[LeadStatus.NO_REPLY]).toContain(LeadStatus.BOUNCED);
  });

  it('allows opt-out from PITCHED and NO_REPLY, and OPT_OUT is terminal', async () => {
    mockSend.mockResolvedValue({ Attributes: { pk: 'LEAD#test', sk: 'META', status: LeadStatus.OPT_OUT } });
    await expect(transitionLead('test', LeadStatus.PITCHED, LeadStatus.OPT_OUT)).resolves.toBeDefined();
    await expect(transitionLead('test', LeadStatus.NO_REPLY, LeadStatus.OPT_OUT)).resolves.toBeDefined();
    expect(VALID_TRANSITIONS[LeadStatus.OPT_OUT]).toEqual([]);
  });
});

describe('transitionLead extraUpdates null -> REMOVE', () => {
  it('emits a REMOVE clause when an extraUpdates value is null', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: {} });
    await transitionLead('slug-1', LeadStatus.SITE_BUILT, LeadStatus.PITCHED, 'sent', {
      pricingUrl: 'https://x',
      lastOutreachSkipReason: null,
    });
    const cmd = mockSend.mock.calls[0][0] as { input: { UpdateExpression: string; ExpressionAttributeNames: Record<string, string>; ExpressionAttributeValues: Record<string, unknown> } };
    expect(cmd.input.UpdateExpression).toContain('REMOVE #lastOutreachSkipReason');
    expect(cmd.input.UpdateExpression).toContain('#pricingUrl = :pricingUrl');
    expect(cmd.input.ExpressionAttributeNames).toMatchObject({ '#lastOutreachSkipReason': 'lastOutreachSkipReason' });
    expect(cmd.input.ExpressionAttributeValues[':pricingUrl']).toBe('https://x');
    // Critically: there must be NO :lastOutreachSkipReason value (it would conflict with REMOVE)
    expect(cmd.input.ExpressionAttributeValues[':lastOutreachSkipReason']).toBeUndefined();
  });

  it('still emits SET clauses for non-null values (no regression)', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: {} });
    await transitionLead('slug-2', LeadStatus.SITE_BUILT, LeadStatus.PITCHED, 'sent', {
      pricingUrl: 'https://y',
    });
    const cmd = mockSend.mock.calls[0][0] as { input: { UpdateExpression: string } };
    expect(cmd.input.UpdateExpression).toContain('#pricingUrl = :pricingUrl');
    expect(cmd.input.UpdateExpression).not.toContain('REMOVE');
  });

  it('treats undefined as no-op (preserves historical shared-library contract)', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: {} });
    await transitionLead('slug-3', LeadStatus.SITE_BUILT, LeadStatus.PITCHED, 'sent', {
      lastOutreachSkipReason: undefined,
    });
    const cmd = mockSend.mock.calls[0][0] as { input: { UpdateExpression: string; ExpressionAttributeValues: Record<string, unknown> } };
    // undefined should NEITHER trigger REMOVE NOR SET — just no-op for that key.
    expect(cmd.input.UpdateExpression).not.toContain('REMOVE');
    expect(cmd.input.UpdateExpression).not.toContain('lastOutreachSkipReason');
    expect(cmd.input.ExpressionAttributeValues[':lastOutreachSkipReason']).toBeUndefined();
  });
});

describe('countLeadsByStatus', () => {
  it('returns Count from DDB Query result', async () => {
    mockSend.mockResolvedValueOnce({ Count: 7 });
    expect(await countLeadsByStatus(LeadStatus.PITCHED)).toBe(7);
  });

  it('returns 0 when Count is missing', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await countLeadsByStatus(LeadStatus.PITCHED)).toBe(0);
  });

  it('uses status-index GSI with Select COUNT', async () => {
    mockSend.mockResolvedValueOnce({ Count: 3 });
    await countLeadsByStatus(LeadStatus.PROSPECT);
    const cmd = mockSend.mock.calls[0][0] as { input: { IndexName: string; Select: string; ExpressionAttributeValues: Record<string, unknown> } };
    expect(cmd.input.IndexName).toBe('status-index');
    expect(cmd.input.Select).toBe('COUNT');
    expect(cmd.input.ExpressionAttributeValues[':status']).toBe('PROSPECT');
  });
});

describe('VALID_TRANSITIONS — ENRICHED → BOUNCED is now valid', () => {
  it('allows ENRICHED → BOUNCED via transitionLead (was throwing pre-fix)', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: { pk: 'LEAD#slug', sk: 'META', status: LeadStatus.BOUNCED } });
    // Just calling without throwing is the assertion — if BOUNCED isn't in
    // the valid targets for ENRICHED, transitionLead throws synchronously
    // before any DDB call.
    await expect(transitionLead('slug', LeadStatus.ENRICHED, LeadStatus.BOUNCED, 'Score: 20')).resolves.toBeTruthy();
    expect(VALID_TRANSITIONS[LeadStatus.ENRICHED]).toContain(LeadStatus.BOUNCED);
  });
});

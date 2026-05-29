// tests/dynamo/campaigns.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock('../../src/dynamo/client.js', () => ({
  docClient: { send: mockSend },
  TABLE_NAMES: { campaigns: 'lb-campaigns-test' },
}));

import {
  getCampaignForNiche,
  _resetCampaignCacheForTests,
  listKnownCampaignNiches,
  writePendingCampaign,
  updateCampaignApproved,
  updateCampaignStatus,
  getCampaignRow,
} from '../../src/dynamo/campaigns.js';

describe('getCampaignForNiche', () => {
  beforeEach(() => {
    mockSend.mockReset();
    _resetCampaignCacheForTests();
  });

  it('returns campaignUuid when row exists and status=approved', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { pk: 'CAMPAIGN', sk: 'NICHE#hvac', niche: 'hvac', status: 'approved', campaignUuid: 'uuid-1' },
    });
    expect(await getCampaignForNiche('hvac')).toBe('uuid-1');
  });

  it('returns null when row exists but status=pending_review', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { pk: 'CAMPAIGN', sk: 'NICHE#hvac', niche: 'hvac', status: 'pending_review' },
    });
    expect(await getCampaignForNiche('hvac')).toBeNull();
  });

  it('returns null when no row exists', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await getCampaignForNiche('hvac')).toBeNull();
  });

  it('caches the result for 5 minutes (subsequent calls do not hit DDB)', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { status: 'approved', campaignUuid: 'uuid-1' },
    });
    await getCampaignForNiche('hvac');
    await getCampaignForNiche('hvac');
    await getCampaignForNiche('hvac');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('normalizes niche to lowercase and trims whitespace', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { status: 'approved', campaignUuid: 'uuid-1' },
    });
    await getCampaignForNiche('  HVAC  ');
    const call = mockSend.mock.calls[0][0];
    expect(call.input.Key.sk).toBe('NICHE#hvac');
  });
});

describe('listKnownCampaignNiches', () => {
  beforeEach(() => mockSend.mockReset());

  it('combines pending and approved into a single set, dedupes', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ niche: 'hvac' }, { niche: 'roofing' }] })
      .mockResolvedValueOnce({ Items: [{ niche: 'hvac' }, { niche: 'landscaping' }] });
    const known = await listKnownCampaignNiches();
    expect(known).toEqual(new Set(['hvac', 'roofing', 'landscaping']));
  });

  it('excludes rejected niches (only 2 queries, not 3)', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] });
    await listKnownCampaignNiches();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe('writePendingCampaign', () => {
  beforeEach(() => mockSend.mockReset());

  it('writes a normalized row with status=pending_review and conditional put', async () => {
    mockSend.mockResolvedValueOnce({});
    const row = await writePendingCampaign({
      niche: '  HVAC  ',
      generatedCopy: { name: 'LB HVAC v1', sequences: [{ steps: [] }] },
      sourceCampaignUuid: 'src-uuid',
      bedrockModelId: 'model-x',
    });
    expect(row.niche).toBe('hvac');
    expect(row.status).toBe('pending_review');
    expect(row.sk).toBe('NICHE#hvac');
    const call = mockSend.mock.calls[0][0].input;
    expect(call.ConditionExpression).toBe('attribute_not_exists(sk)');
  });
});

describe('updateCampaignApproved', () => {
  beforeEach(() => mockSend.mockReset());

  it('updates status=approved with campaignUuid and conditional on pending_review', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignApproved('hvac', 'new-uuid');
    const call = mockSend.mock.calls[0][0].input;
    expect(call.ExpressionAttributeValues[':uuid']).toBe('new-uuid');
    expect(call.ConditionExpression).toContain(':pending');
  });
});

describe('updateCampaignStatus', () => {
  beforeEach(() => mockSend.mockReset());

  it('sets status without condition', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignStatus('hvac', 'rejected');
    const call = mockSend.mock.calls[0][0].input;
    expect(call.ExpressionAttributeValues[':s']).toBe('rejected');
    expect(call.ConditionExpression).toBeUndefined();
  });
});

describe('getCampaignRow', () => {
  beforeEach(() => mockSend.mockReset());

  it('returns the raw row regardless of status', async () => {
    mockSend.mockResolvedValueOnce({ Item: { status: 'pending_review', niche: 'hvac' } });
    const row = await getCampaignRow('hvac');
    expect(row?.status).toBe('pending_review');
  });

  it('returns null when no row exists', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await getCampaignRow('hvac')).toBeNull();
  });
});

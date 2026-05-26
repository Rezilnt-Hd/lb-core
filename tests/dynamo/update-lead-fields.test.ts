import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();
vi.mock('../../src/dynamo/client.js', () => ({
  docClient: { send: (...a: unknown[]) => mockSend(...a) },
  TABLE_NAMES: { leads: 'test-leads' },
}));

import { updateLeadFields } from '../../src/dynamo/leads.js';

beforeEach(() => mockSend.mockReset());

describe('updateLeadFields', () => {
  it('issues an UpdateCommand SETting each field on LEAD#{slug}/META and returns the new item', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: { slug: 'joes-plumbing-miami', customDomain: 'joes.com' } });
    const out = await updateLeadFields('joes-plumbing-miami', { customDomain: 'joes.com' });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0].input;
    expect(cmd.Key).toEqual({ pk: 'LEAD#joes-plumbing-miami', sk: 'META' });
    expect(cmd.TableName).toBe('test-leads');
    expect(cmd.UpdateExpression).toContain('SET');
    expect(cmd.UpdateExpression).toContain('#f0 = :v0');
    expect(cmd.ExpressionAttributeNames['#f0']).toBe('customDomain');
    expect(cmd.ExpressionAttributeValues[':v0']).toBe('joes.com');
    expect(cmd.ReturnValues).toBe('ALL_NEW');
    expect(out.customDomain).toBe('joes.com');
  });

  it('rejects an empty patch', async () => {
    await expect(updateLeadFields('x', {})).rejects.toThrow(/no fields/i);
  });

  // Task 3b — brandColors/logoUrl restored on Lead for site/Astro SiteData
  it('writes brandColors + logoUrl (Astro SiteData fields)', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: { slug: 'x', logoUrl: 'https://cdn/x.png' } });
    const out = await updateLeadFields('x', {
      logoUrl: 'https://cdn/x.png',
      brandColors: { primary: '#1', secondary: '#2', accent: '#3' },
    });
    const cmd = mockSend.mock.calls[0][0].input;
    expect(Object.values(cmd.ExpressionAttributeNames)).toContain('logoUrl');
    expect(Object.values(cmd.ExpressionAttributeNames)).toContain('brandColors');
    expect(out.logoUrl).toBe('https://cdn/x.png');
  });
});

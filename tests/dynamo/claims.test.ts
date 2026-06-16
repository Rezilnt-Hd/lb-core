import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/dynamo/client.js', () => {
  const send = vi.fn();
  return { __sendMock: send, docClient: { send }, TABLE_NAMES: { claims: 'lb-keyword-claims-prod' } };
});
import * as client from '../../src/dynamo/client.js';
const sendMock = (client as any).__sendMock as ReturnType<typeof vi.fn>;
import { claimSlot, getActiveClaim, releaseClaimsForLead } from '../../src/dynamo/claims.js';

beforeEach(() => sendMock.mockReset());

describe('claimSlot', () => {
  it('returns true on a successful conditional put', async () => {
    sendMock.mockResolvedValueOnce({});
    const ok = await claimSlot({
      pk: 'KEYWORD#landscaping dallas#dallas|tx', slug: 'acme', keyword: 'landscaping dallas',
      baseKeyword: 'landscaping dallas', niche: 'landscaping', city: 'Dallas', state: 'TX', rung: 0,
    });
    expect(ok).toBe(true);
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.ConditionExpression).toContain('attribute_not_exists');
    expect(cmd.input.Item.sk).toBe('LEAD#acme');
    expect(cmd.input.Item.status).toBe('active');
  });

  it('returns false when the slot is already taken (ConditionalCheckFailed)', async () => {
    sendMock.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    const ok = await claimSlot({
      pk: 'KEYWORD#landscaping dallas#dallas|tx', slug: 'b', keyword: 'landscaping dallas',
      baseKeyword: 'landscaping dallas', niche: 'landscaping', city: 'Dallas', state: 'TX', rung: 0,
    });
    expect(ok).toBe(false);
  });

  it('rethrows non-conditional errors', async () => {
    sendMock.mockRejectedValueOnce(Object.assign(new Error('throttle'), { name: 'ProvisionedThroughputExceededException' }));
    await expect(claimSlot({
      pk: 'x', slug: 'b', keyword: 'k', baseKeyword: 'k', niche: 'n', city: 'c', state: 's', rung: 0,
    })).rejects.toThrow('throttle');
  });
});

describe('getActiveClaim', () => {
  it('returns the active claim for a slot, or null', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ pk: 'KEYWORD#k#c', sk: 'LEAD#acme', status: 'active' }] });
    const c = await getActiveClaim('KEYWORD#k#c');
    expect(c?.sk).toBe('LEAD#acme');
    sendMock.mockResolvedValueOnce({ Items: [{ status: 'released' }] });
    expect(await getActiveClaim('KEYWORD#k#c')).toBeNull();
  });
});

describe('releaseClaimsForLead', () => {
  it('queries lead-index then marks each active claim released', async () => {
    sendMock.mockResolvedValueOnce({ Items: [
      { pk: 'KEYWORD#a#c', sk: 'LEAD#acme', status: 'active' },
      { pk: 'KEYWORD#b#c', sk: 'LEAD#acme', status: 'released' }, // already released — skipped
    ] });
    sendMock.mockResolvedValueOnce({}); // the one update
    const n = await releaseClaimsForLead('acme', '2026-06-15T00:00:00.000Z');
    expect(n).toBe(1);
    const q = sendMock.mock.calls[0][0];
    expect(q.input.IndexName).toBe('lead-index');
  });
});

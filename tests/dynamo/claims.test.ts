import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/dynamo/client.js', () => {
  const send = vi.fn();
  return { __sendMock: send, docClient: { send }, TABLE_NAMES: { claims: 'lb-keyword-claims-prod' } };
});
import * as client from '../../src/dynamo/client.js';
const sendMock = (client as any).__sendMock as ReturnType<typeof vi.fn>;
import { claimSlot, getActiveClaim, releaseClaimsForLead, listActiveClaims, SLOT_SK } from '../../src/dynamo/claims.js';

const input = (slug: string, keyword = 'landscaping dallas') => ({
  pk: `KEYWORD#${keyword}#dallas|tx`, slug, keyword,
  baseKeyword: 'landscaping dallas', niche: 'landscaping', city: 'Dallas', state: 'TX', rung: 0,
});

beforeEach(() => sendMock.mockReset());

describe('claimSlot', () => {
  it('writes the single sentinel item (sk=SLOT) with a conditional put and returns true', async () => {
    sendMock.mockResolvedValueOnce({});
    const ok = await claimSlot(input('acme'));
    expect(ok).toBe(true);
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Item.sk).toBe(SLOT_SK);   // constant — all leads contend for ONE item
    expect(cmd.input.Item.sk).toBe('SLOT');
    expect(cmd.input.Item.slug).toBe('acme');  // owner recorded on the slot
    expect(cmd.input.Item.status).toBe('active');
    expect(cmd.input.ConditionExpression).toContain('attribute_not_exists');
  });

  it('two different leads target the SAME (pk, SLOT) item so DDB arbitrates one winner', async () => {
    sendMock.mockResolvedValueOnce({}); // acme wins
    sendMock.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' })); // corp loses
    const a = await claimSlot(input('acme'));
    const b = await claimSlot(input('corp'));
    expect(a).toBe(true);
    expect(b).toBe(false); // the mutex held — corp did NOT also win the slot
    expect(sendMock.mock.calls[0][0].input.Item.sk).toBe(SLOT_SK);
    expect(sendMock.mock.calls[1][0].input.Item.sk).toBe(SLOT_SK);
    expect(sendMock.mock.calls[0][0].input.Item.pk).toBe(sendMock.mock.calls[1][0].input.Item.pk);
  });

  it('returns false on ConditionalCheckFailed (slot already held)', async () => {
    sendMock.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await claimSlot(input('b'))).toBe(false);
  });

  it('rethrows non-conditional errors', async () => {
    sendMock.mockRejectedValueOnce(Object.assign(new Error('throttle'), { name: 'ProvisionedThroughputExceededException' }));
    await expect(claimSlot(input('b'))).rejects.toThrow('throttle');
  });
});

describe('getActiveClaim', () => {
  it('GetItem on the sentinel returns the active owner', async () => {
    sendMock.mockResolvedValueOnce({ Item: { pk: 'KEYWORD#k#c', sk: 'SLOT', slug: 'acme', status: 'active' } });
    const c = await getActiveClaim('KEYWORD#k#c');
    expect(c?.slug).toBe('acme');
    expect(sendMock.mock.calls[0][0].input.Key).toEqual({ pk: 'KEYWORD#k#c', sk: 'SLOT' });
  });

  it('returns null when the sentinel is released or absent', async () => {
    sendMock.mockResolvedValueOnce({ Item: { status: 'released' } });
    expect(await getActiveClaim('KEYWORD#k#c')).toBeNull();
    sendMock.mockResolvedValueOnce({}); // no Item
    expect(await getActiveClaim('KEYWORD#k#c')).toBeNull();
  });
});

describe('releaseClaimsForLead', () => {
  it('queries lead-index and releases each active slot with a guarded update', async () => {
    sendMock.mockResolvedValueOnce({ Items: [
      { pk: 'KEYWORD#a#c', sk: 'SLOT', slug: 'acme', status: 'active' },
      { pk: 'KEYWORD#b#c', sk: 'SLOT', slug: 'acme', status: 'released' }, // already released — skipped
    ] });
    sendMock.mockResolvedValueOnce({}); // the one guarded update
    const n = await releaseClaimsForLead('acme', '2026-06-15T00:00:00.000Z');
    expect(n).toBe(1);
    expect(sendMock.mock.calls[0][0].input.IndexName).toBe('lead-index');
    const upd = sendMock.mock.calls[1][0];
    expect(upd.input.ConditionExpression).toContain('slug = :slug');
    expect(upd.input.Key).toEqual({ pk: 'KEYWORD#a#c', sk: 'SLOT' });
  });

  it('skips a slot re-won by another lead mid-release (guarded update fails → not counted)', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ pk: 'KEYWORD#a#c', sk: 'SLOT', slug: 'acme', status: 'active' }] });
    sendMock.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await releaseClaimsForLead('acme')).toBe(0);
  });
});

describe('listActiveClaims', () => {
  it('pages the status-index and returns every active {pk, slug}', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{ pk: 'KEYWORD#a#dallas|tx', slug: 'lead-a' }],
        LastEvaluatedKey: { pk: 'KEYWORD#a#dallas|tx' },
      })
      .mockResolvedValueOnce({
        Items: [{ pk: 'KEYWORD#b#dallas|tx', slug: 'lead-b' }],
      });
    const claims = await listActiveClaims();
    expect(claims).toEqual([
      { pk: 'KEYWORD#a#dallas|tx', slug: 'lead-a' },
      { pk: 'KEYWORD#b#dallas|tx', slug: 'lead-b' },
    ]);
    // queries the status-index with the reserved-word alias on the first page
    expect(sendMock.mock.calls[0][0].input.IndexName).toBe('status-index');
    expect(sendMock.mock.calls[0][0].input.ExpressionAttributeNames['#s']).toBe('status');
    // paginates: second call carries the prior page's LastEvaluatedKey
    expect(sendMock.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ pk: 'KEYWORD#a#dallas|tx' });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

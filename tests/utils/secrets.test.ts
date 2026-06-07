import { it, expect, vi, beforeEach } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(function () { this.send = send; }),
  GetSecretValueCommand: vi.fn(function (input) { Object.assign(this, input); }),
}));

import { getSecret, invalidateSecret } from '../../src/utils/secrets.js';

beforeEach(() => { send.mockReset(); invalidateSecret('lb/test'); delete process.env.FALLBACK_X; });

it('fetches a field from a JSON secret', async () => {
  send.mockResolvedValueOnce({ SecretString: JSON.stringify({ a: '1', b: '2' }) });
  expect(await getSecret('lb/test', 'a')).toBe('1');
});

it('caches: a second call does not re-fetch', async () => {
  send.mockResolvedValueOnce({ SecretString: JSON.stringify({ a: '1' }) });
  await getSecret('lb/test', 'a');
  await getSecret('lb/test', 'a');
  expect(send).toHaveBeenCalledTimes(1);
});

it('falls back to env on Secrets Manager error', async () => {
  send.mockRejectedValueOnce(new Error('AccessDenied'));
  process.env.FALLBACK_X = 'env-val';
  expect(await getSecret('lb/test', 'a', 'FALLBACK_X')).toBe('env-val');
});

it('throws when neither secret nor env fallback is available', async () => {
  send.mockRejectedValueOnce(new Error('AccessDenied'));
  await expect(getSecret('lb/test', 'a', 'FALLBACK_X')).rejects.toThrow(/unavailable/);
});

it('invalidateSecret forces a re-fetch', async () => {
  send.mockResolvedValue({ SecretString: JSON.stringify({ a: '1' }) });
  await getSecret('lb/test', 'a');
  invalidateSecret('lb/test');
  await getSecret('lb/test', 'a');
  expect(send).toHaveBeenCalledTimes(2);
});

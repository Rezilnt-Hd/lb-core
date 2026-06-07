// tests/services/approval-token.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(function () { this.send = mockSend; }),
  GetSecretValueCommand: vi.fn(function (input) { this.input = input; }),
}));

import {
  signApprovalToken,
  verifyApprovalToken,
  getApprovalSecret,
  _resetApprovalSecretCacheForTests,
} from '../../src/services/approval-token.js';

describe('signApprovalToken + verifyApprovalToken', () => {
  it('round-trips a valid token', () => {
    const token = signApprovalToken('secret', ['hvac', 'approve']);
    expect(verifyApprovalToken('secret', ['hvac', 'approve'], token)).toBe(true);
  });

  it('round-trips with three components (Dribbble pattern: niche, id, action)', () => {
    const token = signApprovalToken('secret', ['hvac', 'variant-id', 'approve']);
    expect(verifyApprovalToken('secret', ['hvac', 'variant-id', 'approve'], token)).toBe(true);
  });

  it('rejects tampered components', () => {
    const token = signApprovalToken('secret', ['hvac', 'approve']);
    expect(verifyApprovalToken('secret', ['hvac', 'reject'], token)).toBe(false);
    expect(verifyApprovalToken('secret', ['roofing', 'approve'], token)).toBe(false);
  });

  it('rejects wrong-secret tokens', () => {
    const token = signApprovalToken('secret-a', ['hvac', 'approve']);
    expect(verifyApprovalToken('secret-b', ['hvac', 'approve'], token)).toBe(false);
  });

  it('rejects non-hex tokens', () => {
    expect(verifyApprovalToken('secret', ['hvac', 'approve'], 'not-hex')).toBe(false);
  });

  it('rejects empty token', () => {
    expect(verifyApprovalToken('secret', ['hvac', 'approve'], '')).toBe(false);
  });

  it('rejects length-mismatched tokens (no timingSafeEqual throw)', () => {
    expect(verifyApprovalToken('secret', ['hvac', 'approve'], 'abc123')).toBe(false);
  });
});

describe('getApprovalSecret', () => {
  beforeEach(() => {
    mockSend.mockReset();
    _resetApprovalSecretCacheForTests();
  });

  it('fetches from SM on first call', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: 'my-hmac-key' });
    expect(await getApprovalSecret()).toBe('my-hmac-key');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('caches across subsequent calls (no second SM hit)', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: 'my-hmac-key' });
    await getApprovalSecret();
    await getApprovalSecret();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('throws if SecretString is missing', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(getApprovalSecret()).rejects.toThrow(/approval-hmac/i);
  });
});

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { value: Record<string, string>; exp: number }>();

/**
 * Fetch `field` from a JSON secret in Secrets Manager, cached for TTL_MS.
 * Falls back to process.env[fallbackEnv] on ANY Secrets Manager error, so a service can
 * be flipped to getSecret() before the secret is seeded / IAM granted (env removed later).
 */
export async function getSecret(secretId: string, field: string, fallbackEnv?: string): Promise<string> {
  const now = Date.now();
  const hit = cache.get(secretId);
  if (hit && hit.exp > now && hit.value[field]) return hit.value[field];
  if (!hit || hit.exp <= now) {
    try {
      const res = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
      const value = JSON.parse(res.SecretString || '{}') as Record<string, string>;
      cache.set(secretId, { value, exp: now + TTL_MS });
      if (value[field]) return value[field];
    } catch {
      // fall through to env fallback
    }
  }
  if (fallbackEnv && process.env[fallbackEnv]) return process.env[fallbackEnv]!;
  throw new Error(`Secret ${secretId}.${field} unavailable (no Secrets Manager value or env fallback)`);
}

/** Drop a cached secret so the next getSecret re-fetches (call on a downstream auth failure). */
export function invalidateSecret(secretId: string): void { cache.delete(secretId); }

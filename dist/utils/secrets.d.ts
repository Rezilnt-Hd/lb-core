/**
 * Fetch `field` from a JSON secret in Secrets Manager, cached for TTL_MS.
 * Falls back to process.env[fallbackEnv] on ANY Secrets Manager error, so a service can
 * be flipped to getSecret() before the secret is seeded / IAM granted (env removed later).
 */
export declare function getSecret(secretId: string, field: string, fallbackEnv?: string): Promise<string>;
/** Drop a cached secret so the next getSecret re-fetches (call on a downstream auth failure). */
export declare function invalidateSecret(secretId: string): void;

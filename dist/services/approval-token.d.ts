/** Test-only — drop the secret cache between vitest runs. */
export declare function _resetApprovalSecretCacheForTests(): void;
/**
 * Fetch the HMAC secret from Secrets Manager. Cached process-wide (no TTL):
 * the secret is operationally static; rotation is rare and would require a
 * deploy-and-roll cycle anyway.
 */
export declare function getApprovalSecret(): Promise<string>;
/**
 * HMAC-sign an arbitrary ordered tuple. Callers control the component order;
 * verify must use the same.
 */
export declare function signApprovalToken(secret: string, components: string[]): string;
/**
 * Constant-time verify. Returns false (never throws) for malformed input.
 */
export declare function verifyApprovalToken(secret: string, components: string[], token: string): boolean;

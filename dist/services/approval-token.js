// src/services/approval-token.ts
//
// HMAC-signed approval URLs. Used by both the Dribbble scanner
// (lb-site-builder, signs template variant approve/reject links) and Phase 2
// niche enabler (lb-outreach, signs campaign approve/reject links).
//
// Sign shape: `hex(hmac-sha256(secret, components.join(':')))`. Callers
// MUST pass the same component order to sign + verify. Two-component shape
// for campaign (niche, action); three-component for templates (niche, id,
// action). The helper is component-count agnostic.
//
// Verify uses timingSafeEqual to avoid token-prefix timing oracles. Length
// is checked first because timingSafeEqual throws on length mismatch.
//
// Secret source: Secrets Manager `lb/approval-hmac` (canonical). The fetch
// is cached process-wide — never expires within a Lambda container.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const REGION = process.env.AWS_REGION || 'us-east-1';
const SECRET_ID = 'lb/approval-hmac';
let _client;
let _cachedSecret;
function client() {
    if (!_client)
        _client = new SecretsManagerClient({ region: REGION });
    return _client;
}
/** Test-only — drop the secret cache between vitest runs. */
export function _resetApprovalSecretCacheForTests() {
    _cachedSecret = undefined;
}
/**
 * Fetch the HMAC secret from Secrets Manager. Cached process-wide (no TTL):
 * the secret is operationally static; rotation is rare and would require a
 * deploy-and-roll cycle anyway.
 */
export async function getApprovalSecret() {
    if (_cachedSecret)
        return _cachedSecret;
    const result = await client().send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    if (!result.SecretString) {
        throw new Error(`Secrets Manager returned no SecretString for ${SECRET_ID} (approval-hmac).`);
    }
    _cachedSecret = result.SecretString;
    return _cachedSecret;
}
/**
 * HMAC-sign an arbitrary ordered tuple. Callers control the component order;
 * verify must use the same.
 */
export function signApprovalToken(secret, components) {
    return createHmac('sha256', secret).update(components.join(':')).digest('hex');
}
/**
 * Constant-time verify. Returns false (never throws) for malformed input.
 */
export function verifyApprovalToken(secret, components, token) {
    if (!token || !/^[0-9a-f]+$/i.test(token))
        return false;
    const expected = signApprovalToken(secret, components);
    if (expected.length !== token.length)
        return false;
    try {
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
    }
    catch {
        return false;
    }
}

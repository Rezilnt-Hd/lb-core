# Secrets → AWS Secrets Manager (runtime fetch) — Design

**Date:** 2026-05-27
**Goal:** Move LocalBuilder runtime secrets out of Lambda environment variables (baked in at deploy time) into AWS Secrets Manager, fetched at runtime via a shared `@localbuilder/core` helper — so a secret rotation is **update-in-one-place, picked up live by all consumers, zero redeploys** (today a 7-day Stripe rotation forces a redeploy of every consuming stack or it breaks).

**Architecture:** One `getSecret()` helper in `@localbuilder/core` (the pinned git dep every service already imports). It reads a JSON secret from Secrets Manager, caches it in module scope with a short TTL, and falls back to `process.env` during the transition. Each service swaps `process.env.X` → `getSecret(...)`, gains a `secretsmanager:GetSecretValue` grant, and drops the secret from its deploy params. Secrets are grouped into a handful of JSON secrets to bound cost.

**Tech stack:** AWS Secrets Manager, `@aws-sdk/client-secrets-manager`, TypeScript, Vitest. Deploys unchanged (GitHub Actions → SAM); secrets simply stop being deploy parameters.

---

## Current state (the problem)

Every secret is a GitHub Actions secret → passed as a SAM `--parameter-overrides` value → a CloudFormation `NoEcho` param → a **plaintext Lambda env var, fixed at deploy time**. Consequence: a rotated secret doesn't reach a function until that stack is **redeployed**. The Stripe secret key rotates every 7 days → that's a weekly forced redeploy of lb-payments (and any other consumer) with an outage failure mode if missed. Verified 2026-05-27: rotating Stripe required a manual lb-payments redeploy to restore the live key.

### Runtime-secret inventory (what's coupled to redeploys)
| Secret | Consumer service(s) | Rotation |
|---|---|---|
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | lb-payments | **7 days** |
| INSTANTLY_API_KEY, INSTANTLY_WEBHOOK_SECRET | lb-outreach | rare |
| SERPAPI_KEY, FIRECRAWL_API_KEY, DATAFORSEO_LOGIN/PASSWORD, SCRAPEBADGER_API_KEY | lb-site-builder, lb-keyword-engine, lb-prospector | rare |
| HUNTER_API_KEY | lb-prospector | rare |
| RESEND_API_KEY | lb-support, lb-fulfillment, lb-analytics, lb-retention | rare |
| DOMAIN_TOKEN_SECRET | lb-fulfillment | rare |

Non-secret config (Stripe price IDs, INSTANTLY_CAMPAIGN_ID, HOSTED_ZONE_ID, APP_BASE_URL) stays as deploy params/vars — it doesn't rotate. `AWS_DEPLOY_ROLE_ARN` stays a GitHub secret (the workflow itself uses it).

---

## Decisions (locked)

1. **Store: AWS Secrets Manager for all runtime secrets** (user: "worth the cost to not maintain"). ~5 grouped JSON secrets ≈ $2/mo. Native scheduled rotation is available for credentials that can be minted programmatically (see Rotation).
2. **Runtime fetch via one `@localbuilder/core` helper** — not per-service plumbing, and NOT the CloudFormation `{{resolve:secretsmanager}}` syntax (that resolves at deploy → still needs a redeploy to rotate). Must be a runtime SDK call.
3. **`process.env` fallback during transition** — `getSecret` falls back to the still-present env var on any Secrets Manager error, so code can be flipped before SM is seeded / IAM granted without breaking. Removed per-service once verified.
4. **Migrate incrementally, lb-payments LAST** (it's live). Each service flips independently behind the fallback.

---

## Secret organization in Secrets Manager

Grouped JSON secrets (one `GetSecretValue` per group; bounds cost + rotation granularity):

| Secret id | JSON fields | Consumers |
|---|---|---|
| `lb/stripe` | `secretKey`, `webhookSecret` | lb-payments |
| `lb/instantly` | `apiKey`, `webhookSecret` | lb-outreach |
| `lb/scraping` | `serpapi`, `firecrawl`, `dataforseoLogin`, `dataforseoPassword`, `scrapebadger` | site-builder, keyword-engine, prospector |
| `lb/email` | `resendApiKey` | support, fulfillment, analytics, retention |
| `lb/prospect` | `hunterApiKey`, `domainTokenSecret` | prospector, fulfillment |

A service fetches only the group(s) it needs. (`INSTANTLY_CAMPAIGN_ID` etc. stay deploy params.)

---

## The helper: `@localbuilder/core` `getSecret`

**Files:** Create `lb-core/src/utils/secrets.ts`; export from `lb-core/src/index.ts`; add `@aws-sdk/client-secrets-manager` to `lb-core/package.json`.

```ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TTL_MS = 5 * 60_000; // rotation propagates within ~5 min without redeploy
const cache = new Map<string, { value: Record<string, string>; exp: number }>();

/**
 * Fetch a field from a JSON secret in Secrets Manager, cached for TTL_MS.
 * Falls back to process.env[fallbackEnv] on ANY Secrets Manager error, so a service
 * can be flipped to getSecret() before the secret is seeded / IAM granted.
 */
export async function getSecret(secretId: string, field: string, fallbackEnv?: string): Promise<string> {
  const now = Date.now();
  const hit = cache.get(secretId);
  if (hit && hit.exp > now) {
    const v = hit.value[field];
    if (v) return v;
  } else {
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

/** Drop a cached secret so the next getSecret re-fetches (used on auth failure → instant rotation pickup). */
export function invalidateSecret(secretId: string): void { cache.delete(secretId); }
```

For the critical Stripe path, callers wrap the Stripe call so a `StripeAuthenticationError` triggers `invalidateSecret('lb/stripe')` + one retry — making a mid-rotation key swap zero-downtime (no waiting for the 5-min TTL).

---

## Per-service migration (uniform pattern)

For each consuming service:
1. Bump the `@localbuilder/core` pin to the version with `getSecret`.
2. Replace each `process.env.SECRET` read with `await getSecret('lb/<group>', '<field>', 'SECRET')` (env name kept as fallback). This usually means making the call site async / hoisting the fetch to handler init.
3. Add an IAM statement to the function role: `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:<acct>:secret:lb/<group>-*` (the `-*` covers Secrets Manager's random suffix).
4. Deploy (still env-backed via fallback — safe).
5. Once verified reading from Secrets Manager, remove the secret from `template.yaml` (param + env) and `deploy.yml`.

**Order (low-risk → high-risk):** lb-keyword-engine → lb-prospector → lb-site-builder → lb-support/analytics/retention/fulfillment → lb-outreach → **lb-payments (last, behind its tests + a live `/v1/balance` key check)**.

---

## Rotation story (after migration)

- **Any secret:** rotate at the provider → update the one Secrets Manager value → every consumer picks it up within the 5-min TTL (or instantly via the auth-error refetch on the Stripe path). **No redeploys.**
- **Auto-rotation (hands-off):** Secrets Manager native rotation needs a rotation Lambda that can mint the new credential programmatically — feasible for Stripe **restricted** keys (API-creatable) and DB creds, NOT for Stripe's **account secret key** (rolled in the dashboard). Recommendation: keep manual provider-roll → update-secret for the account key now; evaluate moving lb-payments to Stripe **restricted keys** later to unlock true scheduled auto-rotation. (Out of scope for this migration; the centralized-fetch win stands regardless.)

---

## Seeding

One-time: write current secret values into the grouped JSON secrets via `aws secretsmanager create-secret` (values pulled from the existing GitHub secrets / current Lambda envs). Done before flipping each consumer (or all up front). Secret values never printed.

---

## Testing & verification

- **lb-core:** Vitest unit tests for `getSecret` with a mocked `SecretsManagerClient` — cache hit/expiry, field extraction, env fallback on error, throw when neither present; `invalidateSecret` clears cache.
- **Per service:** after flip+deploy, confirm via logs (a debug "secret loaded from Secrets Manager" on cold start) or a smoke invocation that the credential resolves; then remove the env fallback.
- **lb-payments (last):** post-deploy, validate the Stripe key works (`GET /v1/balance` → 200, HTTP-code only, no value printed) before removing the env param.

---

## Risks & rollback

- **Live payments:** done last; env fallback means the flip can't break it (still reads env until SM verified), and the param is removed only after confirming SM-sourced key works.
- **Cold-start latency:** one `GetSecretValue` per cold start per group, then cached — negligible (~50ms, amortized).
- **Secrets Manager throttling / outage:** the 5-min cache absorbs it; a transient fetch error falls back to env (during transition) or serves the cached value.
- **Rollback:** re-add the deploy param + env var and revert the `getSecret` call (the env fallback means even a partial revert keeps working).

## Out of scope

- Migrating non-secret config (price IDs, campaign/zone IDs) — stays as deploy params.
- Stripe restricted-key adoption + native auto-rotation Lambda (future follow-up).
- The other repos in the workspace (nonprofit-dashboard, trading_bot, dev-factory) — LocalBuilder only.

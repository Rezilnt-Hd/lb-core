# Secrets Manager Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move LocalBuilder runtime secrets from deploy-time Lambda env vars into AWS Secrets Manager, fetched at runtime via a shared `@localbuilder/core` `getSecret()` — so rotating a secret is update-one-value, no redeploys.

**Architecture:** One `getSecret()` helper in `@localbuilder/core` (the pinned dep every service imports): reads a grouped JSON secret from Secrets Manager, caches it (5-min TTL), falls back to `process.env` during transition. Each service swaps `process.env.X` → `getSecret(...)`, gains a `secretsmanager:GetSecretValue` grant, drops the secret from its deploy params. Migrate low-risk → high-risk, lb-payments last.

**Tech Stack:** AWS Secrets Manager, `@aws-sdk/client-secrets-manager`, TypeScript, Vitest, SAM/GitHub Actions.

**Reference:** Spec at `lb-core/docs/superpowers/specs/2026-05-27-secrets-manager-migration-design.md`. Branch `feature/secrets-manager` (lb-core); each service migrates on its own branch + PR. **Service deploys are GitHub Actions only** (never manual `sam deploy`).

**Secret groups (Secrets Manager JSON secrets):**
| id | fields | consumers |
|---|---|---|
| `lb/stripe` | `secretKey`, `webhookSecret` | lb-payments |
| `lb/instantly` | `apiKey`, `webhookSecret` | lb-outreach |
| `lb/scraping` | `serpapi`, `firecrawl`, `dataforseoLogin`, `dataforseoPassword`, `scrapebadger` | site-builder, keyword-engine, prospector |
| `lb/email` | `resendApiKey` | support, fulfillment, analytics, retention |
| `lb/prospect` | `hunterApiKey`, `domainTokenSecret` | prospector, fulfillment |

---

## Task 1: `getSecret` helper in @localbuilder/core

**Files:**
- Modify: `lb-core/package.json` (add dep)
- Create: `lb-core/src/utils/secrets.ts`
- Modify: `lb-core/src/index.ts` (export)
- Create: `lb-core/tests/utils/secrets.test.ts`

- [ ] **Step 1: Add the SDK dep** — in `lb-core/package.json` `dependencies`, add `"@aws-sdk/client-secrets-manager": "^3.700.0"`. Run `cd lb-core && npm install`.

- [ ] **Step 2: Write the failing test `lb-core/tests/utils/secrets.test.ts`**

```ts
import { it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(() => ({ send })),
  GetSecretValueCommand: vi.fn((input) => input),
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
```

- [ ] **Step 3: Run it — verify it fails**

Run: `cd lb-core && npx vitest run tests/utils/secrets.test.ts`
Expected: FAIL — `Cannot find module '../../src/utils/secrets.js'`.

- [ ] **Step 4: Create `lb-core/src/utils/secrets.ts`**

```ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { value: Record<string, string>; exp: number }>();

/**
 * Fetch `field` from a JSON secret in Secrets Manager, cached for TTL_MS.
 * Falls back to process.env[fallbackEnv] on ANY Secrets Manager error, so a service can
 * be flipped to getSecret() before the secret is seeded / IAM granted (then env is removed).
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
```

- [ ] **Step 5: Export from `lb-core/src/index.ts`** — add under `// Utilities`:

```ts
export { getSecret, invalidateSecret } from './utils/secrets.js';
```

- [ ] **Step 6: Run the test — verify it passes**

Run: `cd lb-core && npx vitest run tests/utils/secrets.test.ts`
Expected: PASS (5 tests). Then run the full core suite `npx vitest run` — all pass.

- [ ] **Step 7: Commit**

```bash
git add lb-core/package.json lb-core/package-lock.json lb-core/src/utils/secrets.ts lb-core/src/index.ts lb-core/tests/utils/secrets.test.ts
git commit -m "feat(core): getSecret/invalidateSecret — runtime Secrets Manager fetch with env fallback"
```

- [ ] **Step 8: PR + merge lb-core**, then record the merge commit SHA — it becomes the new `CORE_PIN` each service bumps to in Task 3+.

---

## Task 2: Seed the grouped JSON secrets in Secrets Manager

**Files:** none (one-time AWS setup). Values are read from the current live Lambda envs so nothing is typed/printed.

- [ ] **Step 1: Create the secrets from existing Lambda env values.** Run (us-east-1; pulls current values out of deployed functions, assembles JSON, never echoes):

```bash
export AWS_REGION=us-east-1
gv () { aws lambda get-function-configuration --function-name "$1" --query "Environment.Variables.$2" --output text; }
# lb/stripe (from lb-payments webhook fn)
PF=lb-payments-WebhookFunction-7ZxcpJ1tmnHf
aws secretsmanager create-secret --name lb/stripe --secret-string "$(python -c "import json,os;print(json.dumps({'secretKey':os.environ['SK'],'webhookSecret':os.environ['WH']}))" SK="$(gv $PF STRIPE_SECRET_KEY)" WH="$(gv $PF STRIPE_WEBHOOK_SECRET)")" >/dev/null && echo "lb/stripe created"
```

(Repeat the create-secret for `lb/instantly`, `lb/scraping`, `lb/email`, `lb/prospect`, pulling each field from a function that currently has it in env — e.g. INSTANTLY_* from `lb-outreach-InstantlyWebhookFunction-*`, SERPAPI/FIRECRAWL/DATAFORSEO*/SCRAPEBADGER from a `lb-keyword-engine-*` fn, RESEND_API_KEY from a `lb-support-*` fn, HUNTER_API_KEY/DOMAIN_TOKEN_SECRET from `lb-prospector-*`/`lb-fulfillment-*`. Use the same `python -c json.dumps` pattern so values never appear on the command line literally.)

- [ ] **Step 2: Verify the secrets exist (names + field keys only, never values)**

```bash
for s in lb/stripe lb/instantly lb/scraping lb/email lb/prospect; do
  echo -n "$s: "; aws secretsmanager get-secret-value --secret-id "$s" --query SecretString --output text | python -c "import sys,json;print('fields=',sorted(json.load(sys.stdin)))"
done
```
Expected: each lists its field names (e.g. `lb/stripe: fields= ['secretKey','webhookSecret']`).

---

## Task 3: Flip lb-keyword-engine (the migration recipe, fully worked)

This is the template for every service. Subsequent tasks reference these steps with their own values.

**Files (lb-keyword-engine):**
- Modify: `package.json` (bump `@localbuilder/core` pin to the Task 1 SHA)
- Modify: wherever `process.env.SERPAPI_KEY` / `FIRECRAWL_API_KEY` / `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` / `SCRAPEBADGER_API_KEY` are read (grep to find)
- Modify: `template.yaml` (IAM + later remove params), `.github/workflows/deploy.yml` (later remove params)

- [ ] **Step 1: Bump the core pin.** In `package.json`, set the `@localbuilder/core` git dependency to the Task 1 merge SHA. `npm install`.

- [ ] **Step 2: Find the secret read sites** — `grep -rn "process.env.SERPAPI_KEY\|FIRECRAWL_API_KEY\|DATAFORSEO_LOGIN\|DATAFORSEO_PASSWORD\|SCRAPEBADGER_API_KEY" src/`.

- [ ] **Step 3: Replace each read with `getSecret`** (hoist to async handler/init scope — secrets become an `await`, not a sync top-level const). Field mapping for `lb/scraping`:

```ts
import { getSecret } from '@localbuilder/core';
// was: const serpApiKey = process.env.SERPAPI_KEY!;
const serpApiKey         = await getSecret('lb/scraping', 'serpapi', 'SERPAPI_KEY');
const firecrawlKey       = await getSecret('lb/scraping', 'firecrawl', 'FIRECRAWL_API_KEY');
const dataforseoLogin    = await getSecret('lb/scraping', 'dataforseoLogin', 'DATAFORSEO_LOGIN');
const dataforseoPassword = await getSecret('lb/scraping', 'dataforseoPassword', 'DATAFORSEO_PASSWORD');
const scrapebadgerKey    = await getSecret('lb/scraping', 'scrapebadger', 'SCRAPEBADGER_API_KEY');
```
If a read is in a module-scope sync config object, convert it to an async accessor (`export async function getConfig()`) or fetch inside the handler before first use. Keep the env var names as the 3rd arg (fallback).

- [ ] **Step 4: Add IAM** — in `template.yaml`, add to each function that reads these secrets (or to `Globals` if all do) a policy statement:

```yaml
        - Statement:
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource:
                - !Sub "arn:aws:secretsmanager:us-east-1:${AWS::AccountId}:secret:lb/scraping-*"
```
(The `-*` suffix matches Secrets Manager's random 6-char suffix.)

- [ ] **Step 5: Run tests + commit + PR + merge** (env fallback still active, so behavior is unchanged even before SM is reachable).

```bash
npx vitest run   # expected: all pass
git add -A && git commit -m "feat(keyword-engine): read scraping secrets from Secrets Manager (env fallback retained)"
```
Merge → GitHub Actions deploys.

- [ ] **Step 6: Verify it reads from Secrets Manager** — after deploy, invoke/trigger the function and confirm via CloudWatch logs it succeeds (no `unavailable` throw). To prove it's NOT just using the env fallback, you can temporarily `aws lambda update-function-configuration` to drop one env var in a canary check, OR trust the IAM+secret presence; simplest: confirm a research run completes post-deploy.

- [ ] **Step 7: Remove the env/params** — delete the `SERPAPI_KEY` etc. lines from `template.yaml` (params + `Globals.Environment`) and from `.github/workflows/deploy.yml`. Commit + PR + merge → deploy. Now SM is the only source.

```bash
git add template.yaml .github/workflows/deploy.yml && git commit -m "chore(keyword-engine): drop scraping secrets from deploy params (now Secrets Manager only)"
```

- [ ] **Step 8: Confirm** post-deploy the function still works (reads purely from SM now).

---

## Task 4: Flip lb-prospector
Same recipe as Task 3. Secrets: `SERPAPI_KEY`→`getSecret('lb/scraping','serpapi','SERPAPI_KEY')`, `HUNTER_API_KEY`→`getSecret('lb/prospect','hunterApiKey','HUNTER_API_KEY')`. IAM Resource: `lb/scraping-*` AND `lb/prospect-*`. Remove `SERPAPI_KEY`+`HUNTER_API_KEY` params from template.yaml + deploy.yml after verify. Commit/PR/merge per step.

## Task 5: Flip lb-site-builder
Secrets: `SERPAPI_KEY`, `FIRECRAWL_API_KEY` (+ `DATAFORSEO_*`, `SCRAPEBADGER_API_KEY` if read) → `lb/scraping` fields. IAM Resource `lb/scraping-*`. NOTE: the full build runs in the `lb-site-build-prod` **CodeBuild** project too — confirm CodeBuild's role also gets `secretsmanager:GetSecretValue` on `lb/scraping-*` (CodeBuild reads the same env today via the BuildSiteFunction `forwardEnv`). Remove params from template.yaml + deploy.yml + the BuildSiteFunction `forwardEnv` list + the CodeBuild env after verify.

## Task 6: Flip lb-email consumers (lb-support, lb-analytics, lb-retention, lb-fulfillment)
Each reads `RESEND_API_KEY` → `getSecret('lb/email','resendApiKey','RESEND_API_KEY')`. IAM Resource `lb/email-*`. lb-fulfillment ALSO reads `DOMAIN_TOKEN_SECRET` → `getSecret('lb/prospect','domainTokenSecret','DOMAIN_TOKEN_SECRET')` (IAM also `lb/prospect-*`). One branch/PR per repo. Remove `RESEND_API_KEY` (+ `DOMAIN_TOKEN_SECRET` for fulfillment) params after verify.

## Task 7: Flip lb-outreach
Secrets: `INSTANTLY_API_KEY`→`getSecret('lb/instantly','apiKey','INSTANTLY_API_KEY')`, `WEBHOOK_SECRET`→`getSecret('lb/instantly','webhookSecret','WEBHOOK_SECRET')` (the InstantlyWebhookFunction). IAM Resource `lb/instantly-*` on both functions. `INSTANTLY_CAMPAIGN_ID` stays a deploy param (non-secret). The webhook handler's token check (`process.env.WEBHOOK_SECRET`) must become `await getSecret('lb/instantly','webhookSecret','WEBHOOK_SECRET')` — fetch once at handler init before the auth check. Remove `InstantlyApiKey`/`WebhookSecret` params after verify.

---

## Task 8: Flip lb-payments (HUMAN-GATED — live)

Same recipe, but treated carefully (live revenue path) and **executed only with human confirmation**.

- [ ] **Step 1: Bump core pin, swap reads** — `STRIPE_SECRET_KEY`→`getSecret('lb/stripe','secretKey','STRIPE_SECRET_KEY')`, `STRIPE_WEBHOOK_SECRET`→`getSecret('lb/stripe','webhookSecret','STRIPE_WEBHOOK_SECRET')`. Wrap the Stripe client construction so a `StripeAuthenticationError` calls `invalidateSecret('lb/stripe')` + refetches + retries once (zero-downtime rotation). Stripe price IDs + `APP_BASE_URL` stay as params.

- [ ] **Step 2: IAM** — `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:${AWS::AccountId}:secret:lb/stripe-*` for every lb-payments function (Webhook + Checkout + any dunning/cancellation fns).

- [ ] **Step 3: Tests + PR + merge → deploy** (env fallback retained — cannot break the live key).

- [ ] **Step 4: Verify the live Stripe key resolves from SM** — post-deploy, pull the deployed key from the function and check it works (HTTP code only, no value printed):
```bash
SK=$(aws lambda get-function-configuration --function-name <lb-payments-checkout-or-webhook-fn> --query 'Environment.Variables.STRIPE_SECRET_KEY' --output text 2>/dev/null)
# fallback still present here; the real proof is a successful Stripe call from a cold invocation reading SM —
# confirm via lb-payments logs that a checkout/webhook succeeded post-deploy.
curl -s -o /dev/null -w '%{http_code}\n' https://api.stripe.com/v1/balance -H "Authorization: Bearer $SK"  # 200
```
Also: trigger a test checkout (or inspect recent webhook logs) to confirm payments works end-to-end reading from SM.

- [ ] **Step 5: Remove the Stripe params** — only after Step 4 confirms SM-sourced payments work: delete `StripeSecretKey`/`StripeWebhookSecret` params from `template.yaml` (param + env) and `deploy.yml`. PR + merge → deploy. Re-verify a checkout works.

---

## Task 9: Cleanup

- [ ] **Step 1:** Once every service is verified reading purely from Secrets Manager, delete the migrated secrets from GitHub Actions org/repo secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `INSTANTLY_API_KEY`, `INSTANTLY_WEBHOOK_SECRET`, `SERPAPI_KEY`, `FIRECRAWL_API_KEY`, `DATAFORSEO_LOGIN/PASSWORD`, `SCRAPEBADGER_API_KEY`, `RESEND_API_KEY`, `HUNTER_API_KEY`, `DOMAIN_TOKEN_SECRET`). Keep `AWS_DEPLOY_ROLE_ARN` and non-secret vars.

- [ ] **Step 2:** Update `MEMORY.md` / `feedback_deploy_architecture` note: secrets are now runtime-fetched from Secrets Manager via `@localbuilder/core` `getSecret`; rotation = update the SM value, no redeploy.

---

## Self-Review

**Spec coverage:** helper+tests (T1) ✓, seeding (T2) ✓, per-service flips with IAM+param-removal (T3–T8) ✓, lb-payments human-gated + Stripe refetch-on-auth (T8) ✓, GitHub-secret cleanup (T9) ✓, env-fallback safety throughout ✓, grouped secrets ✓. Gap closed: T5 explicitly covers the lb-site-builder **CodeBuild** role + `forwardEnv` (the build runs outside the Lambda).

**Placeholder scan:** Task 1 is fully coded. T2 gives the exact `create-secret` pattern (repeat for 5 groups with the same json.dumps form). T3 is the fully-worked recipe; T4–T7 specify each service's exact secret→field→IAM mapping (concrete, not "similar to" — only the per-step git/verify mechanics are shared with T3 by reference, which is the genuinely-uniform part). No TBDs.

**Type/name consistency:** `getSecret(secretId, field, fallbackEnv?)` + `invalidateSecret(secretId)` signatures are identical across T1 and every call site. Group ids (`lb/stripe`/`lb/instantly`/`lb/scraping`/`lb/email`/`lb/prospect`) and field names match the spec table and T2 seeding everywhere.

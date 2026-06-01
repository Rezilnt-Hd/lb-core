# lb-core · LocalBuilder

Shared TypeScript library consumed by the lb-* services (lead state machine, shared types/utilities). Not deployed on its own.

## Commands
- Build (typecheck): `npm run build` (tsc)
- Test: `npm test` (vitest run)
- No deploy — changes ship when the consuming service redeploys via its own CI.

## Lead state machine
- `transitionLead` (incl. the `null → REMOVE` path) lives here. Lead-state transitions are centralized — change them here, not in individual services.

## PR rules (CRITICAL)
- Always open a PR; never push directly to `main`. Let CI run.
- A global hook + a Stop hook run `tsc --noEmit` on dirty repos — keep the build green before opening a PR.

## Config & secrets
- No hardcoded secrets/config. Secrets belong in AWS Secrets Manager in the consuming services; this lib stays config-free.

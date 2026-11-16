# Temporary manual Workers Paid capacity policy

This policy is an explicit manual exception, not live subscription API verification. Existing local OAuth and CI tokens cannot read `/accounts/{account_id}/subscriptions` (403). No credential permissions, Cloudflare plan or account settings were changed. Do not infer a Paid plan from `default_usage_model: standard`.

## Fixed account and seven-day deadline

Approved browser observation: 2026-11-16T21:14:33.316Z, correct account shown in `release-evidence/workers-paid-browser-20261116.json`, with an effective Workers Paid subscription label separate from the zone's Free label. Exact evidence hash is recorded in the attestation; the entire attestation's hash is independently pinned in `scripts/worker-capacity-policy.mjs`. Both checked-in inputs must match. The policy is **450 Workers until 2026-11-23T21:14:33.316Z**, strictly exclusive at the deadline. Observation/expiry dates are not advanced on deploy, build, checkout, or script execution.

The hash protects against a modified proof relative to reviewed source. It is NOT an unforgeable signature: someone able to change both trusted code and evidence could replace the policy. Repository access and independent source review remain the trust boundary. Renewal requires another real browser observation, explicit approval, a new pinned attestation and independent review. No environment override or self-reported proof hash is accepted. Missing, wrong-account, altered, future, unknown or expired evidence stops capacity checks, even when inventory is below99. There is no permanent fallback to450.

Residual risk explicitly accepted for this short window: the account could downgrade after the browser observation, and this credential cannot detect that by subscription API. The platform may reject an upload; such failure remains a hard stop. Browser evidence does not guarantee future quota. Cloudflare documents Paid's general500 Worker limit, while this project leaves50 unused. This policy does not raise asset-file limits or any other quota.

## Unified guards and reservations

Production `astro-publisher.mjs` and private CI `staged-private-preview.mjs` both use `readWorkerCapacity`. Full successful SinglePage inventory is required. Counts, page markers, continuation/cursors, next links and duplicate identities are checked; partial responses never justify extra capacity.

Each publishing batch is checked under the shared D1 deployment lease, and the complete remaining batch is rechecked immediately before every creation. Inventory names are deduplicated with planned names and `capacityReservedServices` (known pending names). `capacityReservedNewWorkers:9` additionally reserves the already-known private-CI pending allocation when its randomized names are not available. This may conservatively double-count a reservation after its services appear; removing or replacing it is a reviewed configuration change, never automatic optimism. Numeric reservations are explicitly labeled in receipts and cannot be negative. Cooperating production and private-CI creators use the same D1 lease. Unrelated account writers remain a race, so every precreation check reads live inventory and reconfirms lease ownership after the read. Lease/plan expiry during I/O fails.

The early CI capacity check is advisory and read-only, before build; it reserves its own9 plus configured pending budget. Once actual randomized names exist, batch and precreation checks under the lease use those exact names. Production first computes the inactive slot and private backend names, then checks their complete union. No account resources are deleted or upgraded to make room.

## Failure behavior

For a first migration with no previous private backend, a failed new backend/shard upload cannot switch the public frontend. If no frontend deploy occurred, the outer failure path verifies the original front is unchanged and leaves newly created private artifacts for inspection; it does not delete them or roll back an untouched front. If another writer changed the front, the ownership assertion fails and no rollback/overwrite is attempted. Existing hybrid-backend recovery and recovery after a frontend switch are deliberately unchanged.

## Provenance and verification

These source/policy changes require a new reviewed commit and rebuild/qualification; prior f7d9 compiled artifacts are not relabeled or assumed qualified. Scoped CI includes capacity policy tests. A later attestation renewal is also a source-pin change and must follow the exact-source release process unless an independently reviewed mechanism explicitly qualifies it. Runtime receipts label `runtimeApiPlanVerified:false`, include observedAt/expiresAt and both hashes. No authorization to auto-renew or expand permissions is implied.

References: https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/api/resources/accounts/subresources/subscriptions/methods/get/.

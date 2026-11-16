# Astro publication and staged rollout

## Current status

This branch packages the reviewed Astro frontend alongside the actual mcpappstore source. The feature branch has been pushed for read-only CI preflight; no main merge or public frontend switch has been performed by these publishing scripts during development. Root verified the external Cloudflare Builds validation-only trial left live frontend version `27235e1e-6f6a-44d7-a77d-f69b2cc8cadc` unchanged. Root controls the next remote action.

The actual `scripts/publication.config.json` is enabled with the unchanged `cdn.mcpapp.net/` route and explicit private backend/remote health permissions. The example config remains disabled. Enabled configuration alone does not deploy: real activation also requires exact source HEAD, current D1 owner/content revisions, live routing/binding inventories, current secret inventory, capacity and health gates. No automatic paid upgrade or worker deletion is implemented.

Read-only CI reported 14,664 published apps, 64 submissions, 45 existing workers, empty source-secret inventory, unchanged public routing and no publication triggers before the planned additive migration. Those are observations at preflight time, not frozen expected record counts.

## Authoritative publication and content revisions

Migration0007 creates `astro_publication_state`;0008 adds `content_revision` and33 triggers across the11 public tables. Publication revision/phase track writer ownership. Every public data mutation independently changes content_revision, including native writers that do not use the publisher. Frontend compares both via a tiny primary D1 read for audited HTML; stale/missing/error state falls back to legacy. Assets do not perform full catalog hydration.

Bulk ingestion uses ready→updating→ready ownership CAS. Admin writes use atomic conditional batches. Migration0009 provides a separate short cross-CI deployment lease, renewed using authoritative D1 time; it does not lock content writers. Frontend activation requires receipt buildCommit equal to current checkout and origin/main under the lease. Revisions and data are never rolled back to make an older static artifact appear current.

Seed UPSERT preserves hidden/rejected status and existing nonseed protections. Local SQLite tests preserved64 fixture submissions and historical associations. Production operations compare observed before/after counts, not a hardcoded64 requirement. A seeded record hidden by moderation remains hidden until explicit approval.

## Full public snapshot and immutable artifacts

`astro-publisher.mjs prepare` requires a committed clean source tree and authoritative D1 export bracketed by both revisions. `PRODUCTION_BUILD=true` and `ASTRO_CURRENT_RELEASE=true` build production analytics and the full reviewed route family, not preview HTML.

`expand-public-audit.mjs` imports the checked-in canonicalAppId and isRemovedContentPath helpers. It appends eight-locale canonical published app paths to the reviewed base200. The immutable expanded audit includes snapshot hash and content revision; staging and activation read that audit, never a mutable hand-maintained app list. The earlier narrow-policy local build produced117,493 public URLs. With global Viator exclusion the expected count is117,488 public URLs (14,661 canonical apps ×8 locales +200 fixed pages); the fresh authoritative build must establish the actual count. The owner’s latest global Viator removal supersedes the earlier four-path policy. The exporter excludes public ID viator regardless of stored published status, records excludedAppIds in the manifest/policy hash, and removes its skill associations. Backend and edge deny all locale/alias/app/apps/RSC/OG variants without deleting stored records. Fresh full-route artifacts are required; old private preview artifacts must not become the new public release.

Each attempt has a fresh artifact UUID, even for a code-only rebuild of the same data revision. Artifact files, frontend code, audit and shard hashes are verified. Eight locale asset services enforce a conservative19,000-file ceiling each because current paid-plan capacity was not proved. Frontend bundles only deduplicated internal paths, not eight copies in an environment variable. Retain current and rollback releases plus reproducible snapshot/source copies; cleanup needs separate review.

Curated `frontend/` excludes historical V1/V2 workers and experimental tests. Data catalog/manifest are generated during authoritative prepare and remain ignored, not committed stale snapshots. Release gates include root typecheck, curated Astro check, current-source body/SEO parity, current audited-edge tests, production backend native tests, and publication/lease/rollback/probe tests.

## Canonical production activation

Root npm deploy routes through `deploy-entry.mjs`. GitHub main is the canonical deployment owner with90-minute timeout and non-canceling concurrency. Workers Builds is validation-only. `build-entry.mjs` also fails closed under WORKERS_CI to prevent accidental legacy output for a direct Wrangler command; that guard is not a substitute for verified external CI settings.

CI builds the actual backend and derives a private compiled config preserving DB/KV/R2/IMAGES/assets/vars, with no public routes/workers.dev/preview URL. Exact backend commit is attested at GET-only `/__mcpapp-release`, gated by MCPAPP_PRIVATE_BACKEND. Source-secret inventory must be empty; any secret migration needs separate authorization.

Activation captures prior live versions/binding metadata and refreshes actual domain/zone-route inventory. It refuses route changes. If old frontend depends on private legacy, its prior version is also required. Backend updates first, immutable assets next, frontend last. Smoke checks include docs, audited app, CSS, CDN media, admin401 and permanent410. Failure restores old frontend then old backend under the lease and verifies old health. Rollback failure is surfaced as urgent, never success. No D1 restore is automatic.

Installed Wrangler4.84.1 supports the verified secrets `--format json`, deployment/version `--json`, and positional rollback version flags. Temporary remote-preview probes forward only fixed GET public requests, never caller cookies/auth/body. Startup logs are bounded to64KiB and redacted before retention. Probes are terminated in finally and create no permanent public route.

## Opt-in feature-branch staged migration/private preview

`.github/workflows/astro-private-preview.yml` runs only for a feature-branch commit message containing `[astro-private-preview]`, or an explicitly enabled manual-dispatch input. It does not call public frontend activation or merge main. Before migration it builds and executes all three actual backend native integration gates, checks source/main HEAD, queued/running main Deploy or Skills refresh writers, live version/routes, all current compiled-vs-remote resource IDs/vars, empty secret inventory, and conservative Worker capacity.

A fresh D1 Time Travel bookmark is captured before fixed DDL. Only0007/0008/0009 are allowed;0009 precedes0008 to provide the lease. Each scoped SQL file appends its own exact migration-tracking row. Prior tracking rows are preserved;0006's preexisting tracking gap is neither marked nor repaired. Partial/unexpected schema or tracking mismatches require manual reconciliation rather than replay. No claim of atomic remote multi-file DDL is made.

Local real-D1 tests verify bookmark-first execution, ownership transitions, exact trigger definitions, tracking preservation, hidden-record preservation and fixture submission counts. Runtime before/after catalog counts are checked. A concurrent legitimate submission can conservatively fail the migration and leave its owned publication marker failed for manual reconciliation; no user data is restored or deleted. This is not a blanket no-downtime guarantee.

After migration, the workflow prepares authoritative full-route artifacts and deploys a uniquely named private preview backend plus eight immutable private asset workers. It verifies exact backend commit, shard hashes, and the actual candidate frontend module through temporary remote preview, including app/CSS/CDN media/admin401/permanent410. These are implemented checks, not a claim they have run against production yet. Live mcpapp is never deployed by this staged script, and its version is checked again in finally. Recovery evidence and reproducible public snapshot are retained as workflow artifacts. The bookmark is not automatically restored and its validity is subject to the actual D1 retention plan.


## Confirmed-challenge baseline and browser continuation

Final activation samples the actual deployment client's exact public URLs before changing services. Only the explicit `cf-mitigated: challenge` response can be recorded as an inconclusive baseline. Generic403/body resemblance is not an exemption. A new or unclassified challenge where the baseline was reachable triggers rollback, not an exemption. The original origin's default Viator page was observed200. Only the initial corrected-legacy anchor uses that original baseline/rollback expectation; subsequent Astro activation requires the verified corrected anchor and410 baseline.

After route and private service checks pass, the same confirmed challenge may produce an `awaiting-browser` result, never a successful HTTP result. Exit78 preserves valid publication ready state and does not cause a duplicate deploy. A portable ticket binds exact artifact/commit/front and backend versions, owner/content revisions, nonce, expiry, target service bindings, expected URLs/canonical and separate service-only statuses/delivery/content types and the captured rollback pair. GitHub preserves it as an artifact.

A trusted operator must collect actual normal-browser observations, including navigation and applied styles, without changing WAF or copying clearance cookies. `node scripts/verify-browser-release.mjs --ticket /absolute/ticket.json --observations /absolute/observations.json` performs no build or deployment. It checks fresh matching observations, current exact versions/bindings/routes/revisions, and service health under a short lease, then writes ticket.json.verified.json. A failed/expired or superseded proof is refused. This verification command does not schedule a timer or silently roll back. The rollout owner invokes `rollback-unverified.mjs --ticket /absolute/ticket.json --reason expired`, or `--reason browser-failed --observations /absolute/failed-observations.json`. The command requires the exact release still current, refuses already verified tickets, restores only the captured pair and checks routes/service health; it never restores D1 data. No challenged rollout may be reported fully verified before this finishes.


## Corrected legacy anchor and receipt handoff

The owner must remain available to verify the public browser immediately after the anchor and Astro switches. The initial corrected legacy anchor is a necessary removal-safe rollback target, not a substitute for Astro migration.

1. Commit the reviewed implementation on the feature branch and complete the full private-preview workflow at that exact commit. No live frontend switch occurs in that workflow.
2. Manually run `astro-legacy-anchor.yml` on that same feature commit with the completed private-preview run ID and explicit anchor approval. It downloads the exact-commit artifact, rebuilds/tests the legacy backend, guards source/main/writer overlap and current routing/bindings, then deploys only corrected public legacy. All private origin locale Viator checks must410. It saves a browser ticket, never declares browser verification complete.
3. Collect actual normal-browser observations and run `verify-browser-release.mjs` with the ticket and proof. After exact live version/tag/private commit/routing checks, the resulting `.verified.json` contains an `anchor` object with only public release metadata and a proof digest.
4. Copy only that verified `anchor` object into `release-evidence/verified-legacy-anchor.json` and commit it. Do not commit raw observations, credentials, tickets or private state. No KV registry is used. The final main CI builds fresh artifacts for its new commit and accepts the anchor only if its source is an ancestor, its exact tagged version is still live and direct-service global removal still passes.
5. Final Astro activation captures that safe rollback target. Later hybrid rollbacks require exact prior frontend/backend versions and fresh removal checks. A public challenge produces an explicitly unverified browser ticket, not a success claim; continue verification or invoke the scoped rollback command without rebuilding/redeploying.

Initial anchor deployment failure can restore the original pre-anchor version, including its known Viator regression, to avoid an unverified broken release. Once the anchor is verified, Astro must never select that original unsafe version as its rollback target. Existing Cloudflare legal451 enforcement is unchanged; default public Viator410 and origin global410 are the release checks.

Browser proof uses only observable DOM/visual evidence: exact URLs and canonical links, unobstructed actual content, a visible Gone page without app details, authentication prompt, applied CSS on a checked page and visible loaded images. It must not contain status/header claims. The continuation separately verifies status, delivery headers and content type through the exact live service/version binding and records `browserHttpHeadersVerified:false`, `serviceHttpVerified:true`. Existing Under Attack/challenge settings remain unchanged. Anchor queue checks can use public unauthenticated GitHub read-only API for the exact byeval/mcpappstore repository; authentication is optional, but API errors/rate limits always stop the operation.

# Actual-source migration integration (948eb77, isolated only)

This checkout is copied from actual byeval/mcpappstore948eb77, not the older mcpapp repo. No remote changes were executed. The previous live checkout remains unchanged. These scripts are a migration candidate, not an assertion that daily automation or production routes have been changed.

## Ownership/route phases

1. Keep current legacy backend Worker name/version/dynamic routes available. Deploy an independent Astro frontend with explicit route-family allowlist. Legacy remains the service-bound fallback; do not rename its production resources casually.
2. The migration checkout's daily script defaults `PUBLICATION_TARGET=astro`. It requires an absolute executable `ASTRO_PUBLISHER_SCRIPT`; absence fails before D1 writes. It never runs `npm run deploy` in this mode. `PUBLICATION_TARGET=legacy` is an explicit compatibility choice only, not the default.
3. Parent must provide that adapter. It is invoked `prepare --marker-id ID` (authoritative D1 export, current code removal policy, Astro build/test without live activation), then `activate --marker-id ID` (recheck marker + tested artifact, publish only selected frontend). Parent's exportReadySnapshot/activateVerifiedRelease are suitable building blocks.
4. Do not activate additional route families until parity checks pass. Keep unsupported/dynamic paths served by unchanged legacy handlers, with any required hardened invalidation hooks.
5. Old schedulers and GitHub main deploy must be redirected or retired explicitly. A local `.publication-lock` serializes this checkout only. It does NOT lock separate clones, GitHub, admin requests or manual D1 edits. Single owner coordination is still a production blocker.

## Authoritative D1 freshness contract (supersedes KV draft)

A shared singleton `astro_publication_state(id=1,revision,phase,updated_at)` is authoritative. Migration0007 is owned by the backend integration and must be explicitly applied before rollout; these scripts do NOT auto-bootstrap it. The normalized in-code marker is `{version:1,id:revision,phase,at:updated_at}`. KV is payload cache only, never publication coordination. This avoids KV's same-key write-rate and eventual-consistency hazards.

- Bulk coordinator reads ready state, then CAS changes ready+expected revision to updating+new operation revision BEFORE writes. Missing/updating/failed state blocks a new run. Recovery from failed state requires explicit reconciliation, not silent unlock.
- Admin writers must honor updating and atomically update data plus revision only from expected ready state. The separate backend agent implements this.
- Apply schema/seed while owning updating, verify protected data, purge compatibility cache. Optional explicit legacy deploy happens only in legacy mode.
- CAS updating+own revision to ready. ready denotes DB/cache readiness, not Astro activation. This permits admin activity while the static build runs.
- Prepare the candidate from an authoritative D1 snapshot bracketed by primary ready-state reads. Check same ready revision immediately before and after activation. If admin advanced the revision, refuse/rebuild; never overwrite its state. The frontend reads the tiny primary singleton for audited HTML only and falls back to legacy when revision differs, so a post-check deployment race cannot serve a known stale snapshot.
- On post-mutation failure, attempt cache purge even if deployment failed. CAS own revision to failed, never clobber a different owner's newer state. Cleanup errors are appended to the failure.

D1 ownership protects writers that implement this protocol; direct/manual SQL and old schedulers bypassing it remain external blockers. No global full-catalog export is performed on public requests. Static assets need no publication DB read. In-flight requests already admitted before a change may finish; this does not claim their cancellation.

## Preserving existing data

Original daily protections remain: current nonseed inventory goes into PROTECTED_APPS_PATH, source sync retains failed historical data, missing/duplicate IDs stop publication, compile runs before D1 apply. The new coordinator inventories nonseed rows/submission count again immediately before applying SQL and verifies after. This detects unintended changes but does not roll them back; concurrent legitimate admin changes may conservatively stop the run.

Seed generation now preserves existing seeded statuses hidden/rejected on conflict instead of restoring published from seed. New seeded records still use source status. Existing parent rows, user source guards and historical association preservation remain. Tests create64submission rows and verify all survive seed application. This does not freeze actual submission count at64; production compares observed before/after counts and allows new submissions.

A seeded record hidden by moderation stays hidden until explicit approval. Refetching metadata is not approval. Keep permanent language-specific removals independently of seed status.

## Publication failures/rollback

A build error before D1 writes leaves remote content unchanged. A later error can leave D1 updated; old code rollback does not roll D1 back. Keep latest authoritative marker/deny state when rolling frontend versions back; an older static snapshot must fall back if marker differs. Never restore an old ready marker merely to make old static files appear valid.

IndexNow stays after coordinator success and live URL verification. This means it happens after Astro activation in Astro mode, not merely after legacy deployment. Current smoke checks are only HTTP success; parent should add revision/header/body checks before cutover. The coordinated migration 0007 adds the authoritative D1 singleton; deploy it before enabling these writers.

## Tests and unsatisfied prerequisites

- publication-protocol.test.mjs injects all side effects and performs zero remote operations.
- seed.test.ts uses local temporary SQLite, proving hidden/rejected preservation,64submissions, historical associations and skills-only behavior.
- bash syntax and TypeScript checks run locally.

Not yet completed: scheduled-job/GitHub deploy handoff, production D1 migration/admin rollout, production route cutover, private service deployment/health verification. The real prepare adapter and local D1 writer ownership tests are implemented. The code must not be run remotely until those are coordinated and reviewed.

## Executable adapter status

`scripts/astro-publisher.mjs` is executable. `ASTRO_PUBLICATION_CONFIG` names explicit JSON; config paths resolve relative to that JSON for portable CI. Required fields: astroProject, actualSourceRepo, releaseRoot, auditRoutesFile, sourceCommit (reviewed audit baseline), blockedPaths. Intended monorepo layout is frontend/ (Astro package+lock+source+sharding+audit200), actualSourceRepo '.', and an ignored releaseRoot outside frontend. Vendor the frontend source and its separate lock into the same GitHub repository before CI rollout; the present external Mac project is a development location, not a CI dependency strategy.

Prepare verifies audit baseline ancestry, clean tracked source content, D1 publication state and snapshot; creates a new immutable release directory; runs npm ci/check/audited build, actual-source body/SEO parity and200URL edge tests; extracts exact audited routes, then creates immutable west/east shard directories and a hash receipt. Failed attempts retain FAILED.txt and are never overwritten. Each attempt uses revision-prefix plus a random build UUID, so code-only rebuilds do not alter the D1 revision or overwrite older artifacts. Activation requires the explicit receipt path.

Activate currently verifies artifact identity/hash and D1 revision, then FAILS CLOSED without upload. Missing dependencies are a reviewed frontend Worker config/private legacy service binding, immutable shard deployment/verification adapter, route-cutover plan and deployment owner handoff. This is deliberate: no code path silently falls back to deploying the legacy mcpapp Worker under the frontend name.

Installed vinext0.0.43 exposes --name, but changing name alone does not prove routes/bindings safe. The eventual legacy command must use a reviewed legacy-only config and name mcpapp-legacy, no public frontend route takeover. Root deploy must route through the orchestrator after package/workflow changes are reviewed; those package changes were not made here.


## Verified local release checkpoint

`astro-activation.mjs` generates write-once frontend/shard plans and refuses public/mutated shards, changed frontend code or audit metadata, and unreviewed service names. The generated frontend imports audited route JSON into a module-level Set, not a potentially oversized Worker environment variable. Three actual Wrangler `deploy --dry-run` operations passed without upload. `activatePlan` is an injectable tested frontend-last state machine; CLI upload remains disabled until remote health/cutover effects are reviewed.

`astro-native.integration.mjs reports/offline-activation-plan.json` passed using the generated frontend bundle and actual compiled backend in native Miniflare service bindings with shared local D1: static docs HTML, permanent 410, backend method handling, and revision/updating fallback. Static files were served by local filesystem bindings; this is not a claim that Cloudflare production Assets runtime or live routes were tested.

Offline preparation passed 200 audited URLs, 208 selected files, 3,545,492 source bytes. This uses an explicitly offline fixture and does not authorize live activation. Actual CLI production preparation now sets `PRODUCTION_BUILD=true`; the prototype's unconditional production blocker must be replaced with verified manifest gating by the frontend owner. Preview HTML is not production analytics parity.

Focused local script gates: `node --test scripts/publication-protocol.test.mjs scripts/publication-state.test.mjs scripts/astro-publisher.test.mjs scripts/astro-activation.test.mjs`; `npx tsx --test scripts/seed.test.ts`; `bash -n scripts/daily-crawl.sh`; native integration above after backend build. Prototype V1/V2 and historical seven-locale tests are experimental, not production release gates. Final monorepo packaging must curate active frontend sources and separate experimental tests/readmes before release.

## Current activation and CI implementation

The real activation path is implemented, not a placeholder: explicit activation/legacy/remote-health flags plus routes are required; authoritative revision AND trigger-maintained content_revision are checked. Immutable shards deploy first and are read/hash-verified using temporary Wrangler remote-preview service bindings. Frontend switches last and is checked for static delivery and permanent410. Probe processes bind localhost, suppress Wrangler token/log output, never forward cookies/auth/body, allow only fixed GET public paths, and are terminated in finally with a bounded startup/response timeout. Remote preview is documented at https://developers.cloudflare.com/workers/local-development/ . No remote probe or upload has been executed during development.

Migration0009 supplies an independent D1 cross-CI deployment lease, CAS renewed during asynchronous deployment. Under the lease, source HEAD must match receipt.buildCommit and current origin/main. Publication/content drift still fails closed through the edge even if it races after the last pre-deploy check. Post-deploy verification failures are not automatic code rollback and must be reported; an old static artifact cannot restore stale content because its content_revision mismatches.

`scripts/deploy-entry.mjs` is the proposed root npm deploy target. It detects official WORKERS_CI=1 and reports validation-only rather than claiming deployment. Canonical GitHub main invokes the already-authoritative snapshot build/activation bridge. GitHub needs an adequate timeout and reviewed config. This bridge assumes the private legacy backend has already been built/deployed/verified; it intentionally never deploys the current legacy default mcpapp config. Root package/workflow have not yet been switched here. Official Workers Builds variables: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ .

## Conservative eight-shard rollout

Current plan defaults to eight immutable locale services (EN/ES/FR/DE/RU/ZH_HANS/JA/KO), because a current paid asset limit was not proved. Activation rejects any shard above 19,000 files. No paid upgrade is assumed. Frontend bundles only the deduplicated internal route allowlist, not eight localized copies. Nine Wrangler dry-run configurations (eight assets plus front) passed on an explicit offline fixture; this is not a live-ready production snapshot.

Immutable workers accumulate across releases. Retain the active and verified rollback releases plus verified local/source artifact copies. Cleanup requires a separately reviewed retention inventory; no worker or artifact deletion is performed by these scripts.

Private backend automation is now included: canonical CI builds actual source, generates `dist/server/wrangler.private.json` from the compiled config, preserves DB/KV/R2/IMAGES/assets/vars and pins build commit, while forcing mcpapp-legacy, no routes, no workers.dev or preview URL. Activation inventories original Worker secret names without printing or copying values and refuses nonempty/unreadable inventory. Under the deployment lease it deploys and health-checks private legacy before static shards/front. Local private config dry-run and native eight-shard/real-backend integration pass. No remote changes were made.

Root npm deploy and GitHub workflow now use the canonical bridge in this isolated checkout; GitHub timeout90minutes and non-canceling concurrency avoid interrupting activation mid-switch. `scripts/publication.config.json` remains disabled by default with no frontend routes. Parent rollout owner must review resource/routes/flags and apply the approved migrations before enabling. The daily coordinator validates activation configuration before data writes and generates the private compiled config from the build it already ran.

Final rollout guards additionally attest exact private backend commit via GET-only /__mcpapp-release with MCPAPP_PRIVATE_BACKEND=true, probe an audited app plus CSS/CDN media/admin401/permanent410, and capture actual previous Worker version/binding metadata before changing either service. Read-only Cloudflare domain/zone-route API checks are required at activation and refuse routing differences; GitHub's API credential is used without logging values. Previous private backend version is required when old frontend depends on it. On rollout/smoke failure, restore frontend first, then prior private backend, under the lease; verify old health and surface any rollback failure as urgent, never success. No D1 data/marker rollback is performed. Tests cover single-version refusal, metadata sanitization, rollback ordering/failure and live route checks. Production builds use full current app mode; extraction still requires the reviewed audit allowlist to include every app intended for the release.

The full route audit is now generated after each authoritative snapshot export by importing the same canonicalAppId and isRemovedContentPath helpers used by the renderer. Only published canonical apps are appended to the reviewed base200 across all eight locales. Snapshot hash and content revision are included in the immutable audit and receipt. Current offline dataset produces exactly117,493 URLs /14,662 canonical apps; it preserves the five nonremoved Viator locales and excludes only source-approved removals. Config examples now carry the exact four removal paths, not a broader all-locale ban.

Workers Builds' live direct Wrangler command bypasses npm deploy. Root is handling the external setting correction; do not push this migration until verified. The repository's build-entry additionally fails closed under WORKERS_CI=1, but is not represented as control over arbitrary direct Wrangler commands.

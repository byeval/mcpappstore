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

`expand-public-audit.mjs` imports the checked-in canonicalAppId and isRemovedContentPath helpers. It appends eight-locale canonical published app paths to the reviewed base200. The immutable expanded audit includes snapshot hash and content revision; staging and activation read that audit, never a mutable hand-maintained app list. Current local dataset expansion produced117,493 URLs /14,662 canonical apps. Viator remains eligible in de/fr/ko/ru/zh-hans; only the four approved removal paths are denied.

Each attempt has a fresh artifact UUID, even for a code-only rebuild of the same data revision. Artifact files, frontend code, audit and shard hashes are verified. Eight locale asset services enforce a conservative19,000-file ceiling each because current paid-plan capacity was not proved. Frontend bundles only deduplicated internal paths, not eight copies in an environment variable. Retain current and rollback releases plus reproducible snapshot/source copies; cleanup needs separate review.

Curated `frontend/` excludes historical V1/V2 workers and experimental tests. Data catalog/manifest are generated during authoritative prepare and remain ignored, not committed stale snapshots. Release gates include root typecheck, curated Astro check, current-source body/SEO parity, current audited-edge tests, production backend native tests, and publication/lease/rollback/probe tests.

## Canonical production activation

Root npm deploy routes through `deploy-entry.mjs`. GitHub main is the canonical deployment owner with90-minute timeout and non-canceling concurrency. Workers Builds is validation-only. `build-entry.mjs` also fails closed under WORKERS_CI to prevent accidental legacy output for a direct Wrangler command; that guard is not a substitute for verified external CI settings.

CI builds the actual backend and derives a private compiled config preserving DB/KV/R2/IMAGES/assets/vars, with no public routes/workers.dev/preview URL. Exact backend commit is attested at GET-only `/__mcpapp-release`, gated by MCPAPP_PRIVATE_BACKEND. Source-secret inventory must be empty; any secret migration needs separate authorization.

Activation captures prior live versions/binding metadata and refreshes actual domain/zone-route inventory. It refuses route changes. If old frontend depends on private legacy, its prior version is also required. Backend updates first, immutable assets next, frontend last. Smoke checks include docs, audited app, CSS, CDN media, admin401 and permanent410. Failure restores old frontend then old backend under the lease and verifies old health. Rollback failure is surfaced as urgent, never success. No D1 restore is automatic.

Installed Wrangler4.84.1 supports the verified secrets `--format json`, deployment/version `--json`, and positional rollback version flags. Temporary remote-preview probes forward only fixed GET public requests, never caller cookies/auth/body. Startup logs are bounded to64KiB and redacted before retention. Probes are terminated in finally and create no permanent public route.

## Opt-in feature-branch staged migration/private preview

`.github/workflows/astro-private-preview.yml` runs only for a feature-branch commit message containing `[astro-private-preview]`, or an explicitly enabled manual-dispatch input. It does not call public frontend activation or merge main. Before migration it builds and executes both actual backend native integration gates, checks source/main HEAD, queued/running main Deploy or Skills refresh writers, live version/routes, all current compiled-vs-remote resource IDs/vars, empty secret inventory, and conservative Worker capacity.

A fresh D1 Time Travel bookmark is captured before fixed DDL. Only0007/0008/0009 are allowed;0009 precedes0008 to provide the lease. Each scoped SQL file appends its own exact migration-tracking row. Prior tracking rows are preserved;0006's preexisting tracking gap is neither marked nor repaired. Partial/unexpected schema or tracking mismatches require manual reconciliation rather than replay. No claim of atomic remote multi-file DDL is made.

Local real-D1 tests verify bookmark-first execution, ownership transitions, exact trigger definitions, tracking preservation, hidden-record preservation and fixture submission counts. Runtime before/after catalog counts are checked. A concurrent legitimate submission can conservatively fail the migration and leave its owned publication marker failed for manual reconciliation; no user data is restored or deleted. This is not a blanket no-downtime guarantee.

After migration, the workflow prepares authoritative full-route artifacts and deploys a uniquely named private preview backend plus eight immutable private asset workers. It verifies exact backend commit, shard hashes, and the actual candidate frontend module through temporary remote preview, including app/CSS/CDN media/admin401/permanent410. These are implemented checks, not a claim they have run against production yet. Live mcpapp is never deployed by this staged script, and its version is checked again in finally. Recovery evidence and reproducible public snapshot are retained as workflow artifacts. The bookmark is not automatically restored and its validity is subject to the actual D1 retention plan.

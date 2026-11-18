# Corrected legacy anchor: one canonical CI lifecycle

This workflow supports separate preview-only and release pushes; production release remains gated by the explicit release marker. It does not activate Astro or push main.

## Entry and source identity

- Exact branch: `canonical-anchor-20261118`.
- Preview-only commit message: `[canonical-anchor-preview-only]`. Only the private preview job runs; the production anchor job is explicitly skipped. The public anchor script also rejects preview-only commits. This still creates authorized private Workers and may apply the existing additive migrations; it is not globally read-only.
- Release commit message: `[canonical-anchor-release]`. Only use after explicit release preparation; this reruns exact-commit preview and then may change production.
- Push the preview-only reviewed commit first. No dispatch registration on main is needed.
- Expected main is pinned to `56fbb80375358828abc4d0eeea149e586ffa3a05`.
- Workflow `.github/workflows/astro-legacy-anchor.yml` uses `deploy-main`, `cancel-in-progress: false`.
- A 90-minute preview job runs the existing scoped private-preview script at this exact new SHA. No old 044 preview/runtime receipt is relabeled as new evidence.
- A dependent 60-minute anchor job downloads that same-run/same-SHA receipt, rebuilds and runs existing backend integrations, verifies unchanged main/public state and deploys corrected legacy only.
- The existing cutover budget is checked immediately before upload and before creating a browser ticket. It reserves 45 minutes within a 55-minute internal clock (60-minute job), so a late build refuses the public operation or restores the owned version before opening a new 30-minute browser ticket.

## Real browser delivery

1. Ticket artifact upload is capped at two minutes; the always-run recovery step still starts if that upload fails or times out. Download the actual `legacy-anchor-browser-ticket-<SHA>` artifact. Read its nonce, versions, URLs and `browserDelivery`.
2. Use an ordinary browser to inspect every required observable check. Do not invent HTTP headers/status in DOM observations. Use the existing `validateBrowserObservations` format and actual observations only.
3. On the same repository create `anchor-browser-<runId>-<attempt>` starting at the ticket's exact `buildCommit`. Commit only `.github/anchor-browser/observations.json`. Do not touch the canonical release branch or main. The CI token needs only contents/actions read; the authorized operator submits this branch through existing access.
4. The waiting job authenticates that ref, fixes its immutable head, verifies source ancestry and sole changed path, and reads the bounded original JSON. It then runs the existing `verify-browser-release.mjs` against its own original ticket and current public/private versions. An external `verified: true` or success flag grants nothing.
5. Download `legacy-anchor-resolution-<SHA>` only after the real terminal result. Successful `ticket.verified.json` includes the actual anchor record, original ticket digest, private backend identity, browser proof digest and direct service verification. No main push follows automatically.
6. Only a genuinely verified anchor record may subsequently become `release-evidence/verified-legacy-anchor.json` for the existing canonical main Astro flow. That remains a separate authorized release.

Missing, invalid or temporarily unreadable observations do not waive the deadline. At expiry the existing scoped `rollback-unverified.mjs` restores the still-current anchor's previous version. A superseding public/private version is never rolled back. Temporary current-version read failures and rollback preflight failures before any write attempt are retried within the bounded recovery interval; every attempt rechecks the current versions. A failed rollback command is reconciled once with a read-only version query: only the expected restored version proceeds to health verification. An unknown or different result requires intervention, never a blind write retry. Unknown state cannot authorize a write.

## Limits

This is the existing CI runner lifecycle, not an independent outage-proof service. Runner cancellation/loss, prolonged Cloudflare outage, or a remotely late upload after a failed ambiguous reconciliation can still require intervention. Killing Wrangler does not cancel an already submitted remote write. D1 leases serialize participating writers; Cloudflare has no atomic compare-and-swap against unrelated external administrators. Original intents/recovery and terminal evidence are retained. No automatic repeated deployment/arm occurs.

The private-preview stage may take roughly an hour and may fail on capacity or current data/source changes. Old evidence remains historical; all new source/version evidence must be reviewed as such.

## Astro main parity

The main Deploy workflow also caps ticket upload at two minutes. Its pending-release loop retries transient current, registry and frontend-metadata reads within the original ticket expiry plus ten-minute recovery limit. Pre-write rollback failures recheck current versions before retry. The same rollback command reconciliation refuses blind write retries. These local tests do not replace exact-commit main CI and real browser acceptance.

## Astro main same-CI browser delivery

After the verified anchor, the separately authorized main Deploy run emits its own ticket with `browserDelivery`. For an Astro ticket use `release-browser-<runId>-<attempt>` based on that ticket's exact build commit and commit only `.github/release-browser/observations.json`. Never reuse the anchor observations: take fresh real browser observations for the new frontend/backend pair and nonce.

The main waiting job reads this bounded immutable commit using its read-only GitHub token, validates the observations, and invokes the existing verifier in that same CI job with its existing Cloudflare credentials. The verifier rechecks ticket freshness immediately before writing authoritative D1 verification. Delivery or a submitted `verified: true` flag cannot declare success: the waiting job only resolves after reading and validating the exact D1 registry record and current versions. No external operator Cloudflare credential or separate verification workflow is required.

Both the ticket and final resolution artifacts preserve original observations, delivery commit identity, verified output and any rollback receipt. Missing/invalid delivery retains the original expiry and recovery path.

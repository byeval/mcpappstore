# Audited Astro frontend

Curated active source, not the historical prototype. Only `worker/edge-entry.mjs` is a deployable frontend candidate. V3 is the publication protocol; publishing/export.mjs and state.mjs are read-only SQL dependencies, not an activation path. V1/V2 workers and experimental tests are excluded.

Install with npm ci. Run npm run check and npm run test:release. Prepared builds require authoritative D1 revision AND content_revision plus PRODUCTION_BUILD=true, then npm run test:built with CURRENT_SOURCE_REPO pointing at repository root. Exact audited URLs are the sole static allowlist; other routes stay on private legacy service.

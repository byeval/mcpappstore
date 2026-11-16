# Isolated legacy memory fix (not deployed)

Incident evidence supplied by the coordinator: private candidate `/app/canva` recorded `exceededMemory` / `Worker exceeded memory limit`. React441 is the redacted server render symptom, not an identified React exploit or version mismatch.

The detail route previously loaded and hydrated the complete public catalog for four recommendations. This patch uses bounded 256-row minimal ranking scans, a conservative overlap prefilter, and four final authoritative hydrations. Existing scoring is unchanged. Non-ASCII overlap is retained conservatively for JavaScript case folding. Completely identical score/featured/name/date ties now use explicit ID ordering; the old SQL tie order was unspecified.

Home36, category/platform pages72max, platform count/timestamp are handled in SQL rather than slicing a full hydrated catalog. Search retains96-result limit and existing19LIKE predicates but replaces multiplicative joins with correlated EXISTS. Full-list helpers page DB reads and bulk fetch associations; they still retain the full result, so callers remain a runtime-test risk, not certified memory bounded.

All D1 status guards, missing-ID no-resurrection behavior, global Viator exclusion, final recommendation rechecks, and no-DB development fallback remain. Seed icon fallback is presentation-only for existing published rows.

Source tests against the existing14664-app public export verify related results against full-catalog reference, pagination/count/timestamp/home equality, Unicode matching and irrelevant candidates, immutable hidden/removal behavior, association failure, and deterministic complete ties. Node heap deltas include test/reference allocations and are NOT Cloudflare isolate peak measurements.

`PUBLIC_SNAPSHOT=/path/to/public/catalog.json node tests/backend-memory.integration.mjs` seeds ONLY local Miniflare D1 and validates complete cold/warm HTML streams. It does not query remote D1. Full Worker build, native checks and private version-specific tail observations are required before any production claim. No retries may erase a first cold-render failure.

# Export serializer baseline

These files are exact `lib/llms.ts` and `lib/sitemap.ts` from reviewed commit abbf22a, stored with `.source` suffix to avoid compiling them as application files. Manifest SHA-256 verifies fixture integrity. No git history, remote service or local absolute path is required in CI. Dependencies are loaded from the candidate checkout; the full-list data oracle and existing content/locale fixtures remain in the tests. Updating this baseline is a reviewed content/behavior change, not a way to accept output regressions.

`tests/backend-export-gate.mjs` creates a temporary expected-body file from PUBLIC_SNAPSHOT using these original serializers, first proves candidate exact equality (all app chunks, counts, locales and complete text), then runs native cold/warm endpoint equality against it. The file is deleted afterward. Nothing is truncated or date-normalized.

The unit test freezes the clock to compare two executions. Before generating native expectations it advances the clock one day and asserts identical full bodies. A snapshot producing wall-clock fallback timestamps fails the gate; it must not silently drop lastmod or mask date differences. The authoritative full app/skill snapshot has stable data-derived dates and passes this guard.

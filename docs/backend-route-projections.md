# Isolated route-focused projection fix (base6512, not deployed)

Actual no-KV Cloudflare diagnostics showed `/store` near15seconds and `/mcp-servers` crossing the first-attempt deadline without observed OOM. Larger pages/batches alone were insufficient. This change removes unnecessary fullcatalog hydration from these specific routes rather than extending the deadline.

- `/store`, A–Z index and letter pages read only id/name/tagline/publisher/dates/ordered platform labels. One SQLquery returns the compact index, with no description/tools/previews/categories/submission hydration. It remains a wholecatalog index, not a fixed total-memory bound.
- Metadata uses a single countquery. MCPservers/directory pages use a single summaryaggregate for count/timestamps/platform/auth/transport/quality signals, plus existing category summaries.
- Eight/ten metadata examples use one bounded SQLquery for only renderedfields and exact tool→prompt→preview→repo→install→endpoint signalpriority. No per-example fullhydration/submission reads.
- Primary platform ordering, default platform for absent surfaces, publishedonly/Viator exclusion, canonical/SEOstrings, all8locale labels, groupedordering/counts and timestamps remain unchanged for the actualcatalog. The old `listHydration` intentionally omitted previews, so its interactive count is still design-category count; this patch does not silently redefine it.

Actual public fixture:14663visible records, compactJSON2943912bytes versus full-list18170447bytes. Everyrecord projection/group and both index+letter label helpers are compared to the exact6512baseline in all8locales. Additional tests cover emptycatalog, absent/duplicate ordered surfaces, hidden/removed rows, preview-only records, signalpriority and failures. Query counts are separate from remote walltime/CPU measurements.

The memorygate explicitly requires this paritytest alongside the existingscale test, with authoritative PUBLIC_SNAPSHOT and unchangedfixture check. Native fullstream coverage adds `/store/c` and `/mcp-directory`; it does not certify Cloudflare128MB peaks or remote deadline clearance. All deployment and production changes remain outside this patch.

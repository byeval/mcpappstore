# Isolated D1 round-trip fix (base88a0136, not deployed)

The coordinator's real Cloudflare no-KV diagnostic rendered Canva but canceled `/store` at15seconds without an observed OOM. Increasing the timeout is not this fix.

Full catalog pages grow256→1024 records and fetch app rows/categories/surfaces in a single D1 batch using the identical boundedIDsubquery. The three SELECTs share the batch snapshot; incomplete/failed results reject. Hydration consumes prefetched associations, with no duplicate association reads. At14664apps the test measures46SQLstatements but16roundtrips (15pagebatches plus the publication revision read). Batching is not claimed to reduce SQL billing to16statements.

Related ranking retains minimal columns and conservativeUnicode overlap filtering. Its three bounded SELECTs are also batched. Four winning cards are rechecked and list-hydrated together, restoring the original list projection instead of fetching unnecessary per-app detail/submission/skill data. Exact ranking and complete related card objects match the reference. Measured9SQL/3roundtrips forCanva, versus55previous calls.

Memory tradeoff: at most1024full app rows plus their associations transiently perpage (4x the prior256page), no simultaneous raw14664rows. Fullcatalog consumers still retain their final hydrated catalog and cache serialization; runtime128MB clearance still requires actual Cloudflare validation. Node heap deltas and local workerd timings are not peak-isolate proof.

Run source scale and native full-document tests with PUBLIC_SNAPSHOT pointing to the already-exported public catalog. No liveD1/KV writes, cachepurges, deployment, or source publication are part of these tests.

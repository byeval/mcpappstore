# Discovery and export loading

This change removes rich full-catalog hydration from collections, topics, popular searches, official/remote directories, awesome landing pages, and text/XML exports. Public D1 authority, status filtering, global Viator exclusion, and list-card defaults remain unchanged.

Collection detail and Markdown use a SQL **candidate superset**, followed by the original JavaScript boundary/Unicode matcher and explicit-ID/name/ID ordering. The SQL prefilter conservatively retains non-ASCII text and JSON Unicode escapes. Materializing the narrow text CTE prevents repeating correlated surface/category extraction for every search term. Counts are computed before the existing top-24 display limit. Only those 24 detail cards receive full list-card hydration.

On the authoritative 14,664-record snapshot (14,663 publicly visible), the design collection transfers 1,119 candidates / 550,761 JSON bytes instead of the complete 6,860,195-byte compact collection projection. Rich discovery projection is 11,872,164 bytes versus 18,170,447 bytes for full list-card payloads. These are serialized payload sizes, **not isolate peak-memory measurements**. Topic scoring can match all records from metadata alone, so topic/official/remote/popular consumers deliberately retain complete compact projections to preserve counts and ordering. This is not a claim of constant total memory or proven remote latency.

Text/XML exports use the same authored serializers. Complete sitemap inventory and collection counts are not truncated. Original serializers are pinned as test fixtures with hashes; mandatory CI generates expected bodies from its authoritative PUBLIC_SNAPSHOT, verifies clock invariance, and compares complete cold/warm native Worker responses. It does not depend on local ignored expected files or git-history availability.

The backend memory gate now requires discovery parity, export parity and native HTML/export checks. Every source failure and partial D1 result fails closed. Local SQLite/workerd parity is necessary but not a substitute for first-attempt private Cloudflare full-body/CPU evidence before any production activation.

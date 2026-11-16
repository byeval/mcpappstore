# CDN media verification is separate from Worker origin

`cdn.mcpapp.net` is the existing R2 custom domain for `mcpapp-assets`. An internal fetch through the mcpapp Worker service is not that CDN request; its404 must never be counted as a delivery regression or waived as a successful CDN check.

The release proof has three distinct parts:

1. Worker-origin checks: app/docs/canonical, CSS, auth and removals through exact live Worker service/version. The helper refuses CDN-host checks here.
2. Object/mapping checks: a temporary private read-only R2-binding probe gets only explicitly supplied public icons/previews keys. It returns presence, actual object MIME/SHA256/size (max5MB), not object bytes or public HTTP status. Cloudflare's custom-domain mapping is read before and after; bucket, hostname, enabled state, zone, active SSL/ownership and mapping digest must match. Results explicitly say `deliveryVerified:false`.
3. Public delivery checks: actual HTTPS request or normal-browser exact CDN URL/rendered-image observations. A confirmed403 challenge is not delivery success. Browser image proof cannot be replaced by R2 object metadata or a screenshot from an earlier deployment.

Browser continuation still requires the real image to be visibly loaded for the exact release/time/URL, along with its other scoped observations. Do not invent natural dimensions from a document title or an R2 object. Object evidence is independent from that browser proof.

Data-only inheritance compares original direct R2 object bytes and exact mapping, unchanged runtime and static asset evidence, plus the same explicitly confirmed public challenge. It records `freshCdnDeliveryVerified:false`, never fresh public/browser delivery. The original direct baseline seven-day bound remains unchanged.

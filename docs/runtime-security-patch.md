# Runtime security patch (2026-11-16)

This patch follows a focused audit of `0846ea1184c171fe4d28be9840433d32f62b1d03` against the original `948eb77` lock. The 23 root audit findings used the same affected package versions as the original baseline. Existing exposure is not a reason to deploy an affected rollback anchor.

## Runtime evidence and limits

- `react-server-dom-webpack@19.2.5` was labelled a development dependency but its production Edge decoder was present in the compiled Worker. An unauthenticated POST with `x-rsc-action` can reach `decodeReply` before action lookup. Missing Origin is accepted. Body-size and container-cycle checks exist, but are not equivalent to the upstream patched runtime.
- React's [RSC denial-of-service advisory](https://github.com/react/react/security/advisories/GHSA-rv78-f8rc-xrxh) covers this version. Its [RSC RCE advisory](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3) also covers the package, but describes a rare response condition involving multiple typed arrays and attacker-controlled data. This application's action manifest was empty; no application `use server` declarations were found. **An exploitable RCE in this application was not demonstrated.** No exploit or production attack testing was performed.
- [Vite RSC advisory](https://github.com/vitejs/vite-plugin-react/security/advisories/GHSA-w94c-4vhp-22gx): the plugin vendors Flight, so updating only the separately installed RSC package is insufficient assurance. The official npm tarball for plugin `0.5.39` contains Flight `19.3.1`.
- `zod@4.3.6` was directly reachable through submission JSON-array parsing before rate limiting/CAPTCHA. A bounded local sample of 100 invalid elements with `.max(4)` produced 101 issues before the patch and one size error afterward. See [advisory and upstream references](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). This is evidence of error amplification, not an executed denial-of-service attack.
- The installed optional Next package was not the deployed Next server runtime. `next/og` resolves through Vinext to `@vercel/og/dist/index.edge.js`. The [Next ImageResponse RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) explicitly exempts its Edge implementation. Windows/Node Next image-optimizer claims were not established for this Cloudflare Worker.

## Exact minimal dependency changes

Root: `react`, `react-dom`, `react-server-dom-webpack` **19.3.1**; `@vitejs/plugin-rsc` **0.5.39**; `zod` **4.6.6**. Frontend: React and React DOM **19.3.1**. These remain within Vinext `0.0.43`'s declared peer ranges; Vinext, Vite and Cloudflare tooling were not intentionally upgraded.

Normal npm resolution also pruned **15 unused optional lock entries**, including the optional Next `16.2.4` tree and an optional nested TypeScript. Next was not upgraded or added as an application dependency. Root has 15 changed/new package-version entries including the requested runtime and necessary plugin dependencies; frontend has only React, React DOM and scheduler changes. Full details: `reports/security-lock-delta.json`.

## Residual audit findings

After clean `npm ci`, root audit is **19, not zero**: 0 critical, 12 high, 5 moderate, 2 low. Frontend remains 3 high, specifically nested development Miniflare/Sharp/Undici; its own Astro Sharp/Undici nodes were not flagged. Most remaining root findings concern tooling, but the moderate OG/Satori chain is bundled, so this is not a blanket claim that all remaining findings are development-only or harmless. No broad `npm audit fix` was run.

## Verification

- Clean root and frontend `npm ci` completed.
- Root typecheck, 19 backend source tests (including `tests/backend-security.test.ts`), and 60 script tests passed.
- Frontend Astro check: zero errors; release suite: 15 tests passed.
- Full backend build and all three actual Worker integration suites (publication transactions, release endpoint, global Viator removal) passed. Results are recorded in `reports/security-backend-*.log`.
- A new authoritative private CI snapshot/build/parity run is required. Old ignored frontend data and the pre-patch private preview are not evidence for this patched release.
- No deployment, push, WAF changes or production data changes were made by this patch task.

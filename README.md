# MCP App Store

[mcpapp.net](https://mcpapp.net) is a public MCP App Store for discovering MCP apps, ChatGPT apps, Claude connectors, and related MCP servers. It helps users compare AI app integrations by platform support, tools, categories, previews, publishers, authentication, and workflow fit.

The app is built with Vinext, React 19, and Cloudflare Workers, with catalog data and assets backed by Cloudflare D1, R2, and KV.

For the longer product and architecture notes, see [PLAN.md](./PLAN.md).

## SEO Focus

MCP App Store is built to be an indexable directory for people searching for Model Context Protocol apps and AI assistant integrations. Core topics include MCP apps, MCP servers, ChatGPT apps, Claude connectors, Claude MCP integrations, AI tools, app directories, workflow automation, developer tools, productivity apps, data connectors, design tools, and MCP-powered assistants.

Useful landing pages on [mcpapp.net](https://mcpapp.net):

- [MCP App Store](https://mcpapp.net) - browse featured MCP apps and connectors
- [Awesome MCP Apps](https://mcpapp.net/awesome-mcp-apps) - GitHub-friendly MCP app, server, and connector list
- [ChatGPT apps](https://mcpapp.net/chatgpt-apps) - compare MCP-backed apps for ChatGPT
- [Claude connectors](https://mcpapp.net/claude-connectors) - discover Claude MCP connectors
- [MCP app directory](https://mcpapp.net/store) - browse the full app index
- [Learn MCP basics](https://mcpapp.net/learn) - guides for users and builders

## Search and measurement operations

Prioritize `/chatgpt-apps`, `/claude-connectors`, and the comparison guide before expanding generated landing pages. Keep historical catalog records and URLs. Improve useful content and inspect canonical/indexing evidence before removing or noindexing pages.

`/sitemap.xml` lists every catalog shard. Already-submitted `/sitemaps/apps.xml` and `/sitemaps/skills.xml` remain valid: when a catalog exceeds 50,000 localized URLs, the stable endpoint becomes a sitemap index linking all shards. Run `npm run audit:sitemaps` after deployment; it fetches XML only, checks limits and duplicate URLs, and compares legacy discovery with current shards. Resubmit the main index in Search Console after a shard layout change. A successful sitemap fetch does not mean pages are indexed.

GA4 uses one explicit `page_view` per navigation. In the web stream's enhanced measurement settings, keep **Page changes based on browser history events off**; `send_page_view: false` alone does not disable that separate setting. Other enhanced measurements can remain enabled. Review the effective configuration after changing the Google tag.

Meaningful catalog events:

- `app_open`: a person activates the external connect/platform link on an app detail page; not proof of a completed installation.
- `mcp_copy`: clipboard write succeeds for an endpoint, install command, config, or prompt; only the app ID and copy type are sent, never copied contents.
- `generate_lead`: a successful submission POST issues a short-lived receipt, consumed once on the success page; opening that URL alone does not count. Do not submit fake production listings to test it.

Mark these names as key events in GA4. Compare them alongside engaged sessions, source/medium and landing pages. Search Console clicks represent Google search only; GA4 measures browser events; Cloudflare zone requests include assets, APIs, bots, challenges and errors. Align dates, timezone, hostname and metric before comparing. Do not divide GA4 users by all edge requests as a tracking-loss estimate.

Local/preview hosts and browsers exposing `navigator.webdriver` do not initialize the application analytics loaders. For browser checks on production, set `window.__MCPAPP_DISABLE_ANALYTICS__ = true` before app scripts, or set `sessionStorage["mcpapp:analytics:disabled"] = "1"` before reloading. Also block `googletagmanager.com`, `google-analytics.com` (including regional endpoints), `static.cloudflareinsights.com` and `/cdn-cgi/rum` at the test browser's network layer: Cloudflare may inject its own beacon independently. These guards isolate tests; they do not classify all production bots. Never filter entire cities or countries solely because their engagement is low.

Validation: `npm run check`, `node --import tsx --test scripts/discovery.test.ts scripts/browser-analytics.test.ts scripts/sitemap-discovery.test.ts`, `npm run audit:seo`, `npm run smoke:seo`, and `npm run build`. The analytics tests use an in-memory browser, and SEO smoke reads only a local server. Verify the live index and representative HTML after release; wait for Google's processing before judging search growth.

## Content quality and four-week observation

The accepted scope and content rules are maintained in [PLAN.md](./PLAN.md). App editorial evidence lives in `lib/app-editorial.ts`; reviewed canonical aliases live in `lib/catalog-identity.ts`. Add an alias only after comparing platform, surface type, and external ID. Do not delete historical records. Release checks reject missing evidence, identity drift, or placeholder guide bodies, while duplicate-title groups remain an explicit review queue.

Run `npm run audit:seo -- --output=reports/seo-content-audit.json` for the full identity/metadata queue and translation coverage. Run `python3 scripts/seo-health.py --base-url http://localhost:3001 --output reports/seo-local-health.json` against a local server, or omit the base URL to check production. The latter performs read-only HTTP requests; it does not execute browser analytics or submit forms. Requests still count at the edge.

[The observation cohort](./ops/seo-observation.json) fixes 20 English/Chinese questions, target pages, and review dates (November 18, November 25, December 2, December 9). The `SEO observation` GitHub workflow archives public checks weekly for that window; it remains manually runnable afterward. Its artifacts are technical availability/content evidence only. GA4/GSC exports and actual AI answers are not automatically collected by this workflow. Keep account exports in ignored `reports/` rather than publishing them with source code.

For each review, compare equal complete seven-day windows with the same reporting timezone and hostname. Record GSC query/page clicks, impressions and selected-page indexing; GA4 engaged sessions, referrals and meaningful catalog events; and Cloudflare HTML/error/bot traffic separately from total requests. For each AI question, save provider, model, date, locale, exact prompt, answer and cited URL. Unmeasured citations stay unknown, not zero; mentions without a link are not citations. Evaluate the four-week trend rather than promising a ranking or citation increase.

## Stack

- Vinext app router on Cloudflare Workers
- React 19 and React Server Components
- TypeScript
- Cloudflare D1 for catalog data
- Cloudflare R2 for app icons and preview assets
- Cloudflare KV for cache, rate limiting, and related runtime state
- Wrangler for Cloudflare deployment

## Getting Started

Install dependencies:

```sh
npm install
```

Run the local dev server:

```sh
npm run dev
```

Run type checks:

```sh
npm run check
```

Build production output:

```sh
npm run build
```

## Common Scripts

```sh
npm run dev                 # Start Vinext dev server
npm run check               # Type-check without emitting files
npm run build               # Build production output
npm run deploy              # Build and deploy to Cloudflare Workers
npm run cf-types            # Generate Cloudflare binding types
npm run seed                # Seed catalog data
npm run scrape              # Scrape ChatGPT app data
npm run scrape:claude       # Scrape Claude connector data
npm run skills:refresh      # Refresh skill data
```

## Deployment

Deployment uses Vinext's Cloudflare Workers target:

```sh
npm run deploy
```

In non-interactive environments, Wrangler requires a Cloudflare API token:

```sh
export CLOUDFLARE_API_TOKEN=...
npm run deploy
```

The Worker configuration lives in [wrangler.jsonc](./wrangler.jsonc). Generated deploy output is written under `dist/`.

## Project Layout

- `app/` - routes, pages, metadata routes, and API handlers
- `components/` - shared UI components
- `lib/` - data access, i18n, SEO, auth, and catalog helpers
- `migrations/` - D1 database migrations
- `scripts/` - import, scrape, media, and maintenance scripts
- `seed/` - seed data
- `worker/` - Cloudflare Worker entrypoint

## Localization

Supported locale routing is configured in [lib/i18n.ts](./lib/i18n.ts). Localized content patches live in [lib/content-i18n.ts](./lib/content-i18n.ts). The canonical Simplified Chinese locale is `zh-hans`; legacy incoming tags such as `zh` and `zh-CN` normalize to it.

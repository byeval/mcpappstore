# MCP App Store

[mcpapp.net](https://mcpapp.net) is a public MCP App Store for discovering MCP apps, ChatGPT apps, Claude connectors, and related MCP servers. It helps users compare AI app integrations by platform support, tools, categories, previews, publishers, authentication, and workflow fit.

The app is built with Vinext, React 19, and Cloudflare Workers, with catalog data and assets backed by Cloudflare D1, R2, and KV.

For the longer product and architecture notes, see [PLAN.md](./PLAN.md).

## SEO Focus

MCP App Store is built to be an indexable directory for people searching for Model Context Protocol apps and AI assistant integrations. Core topics include MCP apps, MCP servers, ChatGPT apps, Claude connectors, Claude MCP integrations, AI tools, app directories, workflow automation, developer tools, productivity apps, data connectors, design tools, and MCP-powered assistants.

Useful landing pages on [mcpapp.net](https://mcpapp.net):

- [MCP App Store](https://mcpapp.net) - browse featured MCP apps and connectors
- [ChatGPT apps](https://mcpapp.net/chatgpt-apps) - compare MCP-backed apps for ChatGPT
- [Claude connectors](https://mcpapp.net/claude-connectors) - discover Claude MCP connectors
- [MCP app directory](https://mcpapp.net/store) - browse the full app index
- [Learn MCP basics](https://mcpapp.net/learn) - guides for users and builders

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

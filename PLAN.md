# MCP App Store — Build Plan

A public directory of **MCP apps** — consumer-facing integrations with an avatar, preview images, and example prompts (not a developer registry of transports/endpoints/tools). Modeled on chatgpt.com/apps: users browse a curated grid, drill into visual app detail pages, and submit their own apps through an open form. Initial catalog is seeded by scraping the ChatGPT apps directory via Chrome MCP.

**MCP app vs. MCP server.** An MCP app is the product-level experience — name, avatar, tagline, preview mockups, developer, category. An MCP server is the technical backend that powers it (transport, endpoint, tools). This directory surfaces *apps*; any technical connection metadata stays out of the public UI.

---

## 1. Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│   └── vinext app (React 19 + RSC, SSR on Cloudflare Workers)     │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
     ┌─────────┐           ┌──────────┐           ┌──────────┐
     │   D1    │           │    R2    │           │   KV     │
     │ catalog │           │  icons,  │           │  ISR     │
     │ schema  │           │ screens, │           │  cache,  │
     │         │           │ manifest │           │  rate-   │
     └─────────┘           └──────────┘           │  limit   │
                                                  └──────────┘
          │
          ▼
     ┌─────────────────────────────────┐
     │ Submission pipeline             │
     │  • Open form  → server action   │
     │  • Validation (Zod)             │
     │  • Rate-limit by IP (KV)        │
     │  • Turnstile captcha            │
     │  • Insert w/ status=pending     │
     └─────────────────────────────────┘
          │
          ▼
     ┌─────────────────────────────────┐
     │ Admin moderation                │
     │  /admin (basic auth via env)    │
     │  approve → status=published     │
     │  reject  → status=rejected      │
     └─────────────────────────────────┘
```

**Why vinext:** native Workers deploy, direct `env.DB` / `env.BUCKET` bindings inside server components, Next 16 API surface, Rolldown-speed builds. No custom worker entry for bindings.

---

## 2. Data Model (D1)

```sql
-- Core catalog
CREATE TABLE apps (
  id              TEXT PRIMARY KEY,            -- slug, e.g. "linear"
  name            TEXT NOT NULL,
  tagline         TEXT NOT NULL,               -- one-line description
  description     TEXT,                        -- long markdown body
  avatar_key      TEXT NOT NULL,               -- R2 object key — REQUIRED (every app has an avatar)
  homepage_url    TEXT,
  publisher       TEXT NOT NULL,               -- "Developer" in the Information table
  publisher_url   TEXT,                        -- publisher website
  -- Information table fields (mirrors chatgpt.com/apps detail "Information" block)
  capabilities    TEXT,                        -- JSON array, e.g. ["Interactive","Writes","Reads"]
  version         TEXT,                        -- semver string, e.g. "3.0.0"
  privacy_url     TEXT,
  terms_url       TEXT,
  support_url     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','published','rejected','hidden')),
  is_featured     INTEGER NOT NULL DEFAULT 0,
  example_prompts TEXT,                        -- JSON array of strings (short prompt labels)
  source          TEXT NOT NULL DEFAULT 'user' -- 'user' | 'chatgpt_seed'
                    CHECK(source IN ('user','chatgpt_seed','admin')),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  published_at    INTEGER
);

CREATE INDEX idx_apps_status_featured ON apps(status, is_featured DESC, published_at DESC);
CREATE INDEX idx_apps_publisher ON apps(publisher);

-- Categories (many-to-many)
CREATE TABLE categories (
  slug  TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE app_categories (
  app_id        TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  PRIMARY KEY (app_id, category_slug)
);

-- Preview "bubbles" shown on the detail page (chat-style mockups).
-- Mirrors the three-up card row on chatgpt.com/apps/{app} above the long description.
-- Every app MUST have at least one preview with an image.
CREATE TABLE app_previews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id      TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  sort        INTEGER NOT NULL DEFAULT 0,       -- ordering within the gallery
  prompt      TEXT NOT NULL,                    -- speech-bubble copy, e.g. "@Adobe Photoshop blur the background"
  caption     TEXT,                             -- optional caption under the image
  image_key   TEXT NOT NULL,                    -- R2 object key for the mockup image (REQUIRED)
  cta_label   TEXT,                             -- e.g. "Open in Photoshop"
  cta_url     TEXT
);
CREATE INDEX idx_previews_app_sort ON app_previews(app_id, sort);

-- Tags (free-form)
CREATE TABLE tags (slug TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE app_tags (
  app_id   TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL REFERENCES tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (app_id, tag_slug)
);

-- Submission audit trail
CREATE TABLE submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id        TEXT REFERENCES apps(id) ON DELETE SET NULL,
  submitter_email TEXT,                    -- optional, from form
  submitter_ip  TEXT,
  raw_payload   TEXT NOT NULL,             -- JSON dump of form
  reviewed_by   TEXT,
  review_notes  TEXT,
  created_at    INTEGER NOT NULL
);
```

R2 layout:
- `avatars/{app_id}.png` — square app avatar (required, 512×512)
- `previews/{app_id}/{n}.jpg` — chat-bubble preview images (from `app_previews`)

---

## 3. Sitemap & Routes

| Route                         | Purpose                                                     | Render   |
|-------------------------------|-------------------------------------------------------------|----------|
| `/`                           | Homepage: hero carousel + category tabs + grid              | SSR+ISR  |
| `/category/[slug]`            | Single category listing                                     | SSR+ISR  |
| `/app/[id]`                   | App detail page (tagline, description, tools, install, prompts) | SSR+ISR |
| `/search?q=…`                 | Full-text search (D1 FTS5 or LIKE fallback)                 | SSR      |
| `/submit`                     | Open submission form                                        | SSR      |
| `/submit/success`             | Thank-you page                                              | Static   |
| `/admin`                      | Moderation queue (basic-auth gated)                         | SSR      |
| `/admin/[id]`                 | Review/edit single submission                               | SSR      |
| `/api/submit`                 | POST handler (server action / route handler)                | Worker   |
| `/api/og/[id]`                | Dynamic OG image for sharing                                | Worker   |
| `/sitemap.xml`, `/robots.txt` | SEO                                                         | Static   |
| `/_revalidate`                | Protected endpoint to bust ISR cache after admin actions    | Worker   |

---

## 4. Design System (Hybrid)

Visual language follows the ChatGPT apps pattern — soft gradients, rounded 16–24px cards, pill category tabs, featured hero carousel — but each card and detail page exposes MCP-specific metadata.

**Tokens**
- Type: Inter (headings 600/700, body 400/500). Sizes: 14/16/18/24/32/48.
- Radius: `sm 6 / md 12 / lg 16 / xl 24`.
- Spacing: 4pt grid.
- Color: near-white base (`#fafafa`), ink text (`#0a0a0a`), muted (`#6b7280`), accent brand TBD. Dark mode later.
- Shadow: single soft elevation `0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)`.

**Key components**
- `<HeroCarousel>` — auto-advance featured apps, chat-bubble preview per slide.
- `<CategoryTabs>` — pill group, active state filled ink.
- `<AppCard>` — square avatar, name, tagline, chevron. No developer chips.
- `<AppDetail>` — mirrors the chatgpt.com/apps detail layout exactly, top-to-bottom:
  1. **Header strip** — avatar, name, tagline, primary CTA (`Connect`).
  2. **Preview gallery** (`<PreviewBubbles>`) — 3-up horizontal row of chat-bubble previews (prompt text → preview image → optional CTA button inside the image card). Scrolls horizontally on mobile. Sourced from `app_previews`.
  3. **Long description** — prose/markdown, 2–3 paragraphs.
  4. **Try prompts like this** — bulleted list of `example_prompts` with a "copy" affordance.
  5. **Information table** — two-column grid mirroring ChatGPT's pattern:
     - Category · Capabilities · Developer · Website · Version · Privacy Policy · Terms of Service · Customer support
     - External links render with the little arrow-out glyph.
- `<SubmitForm>` — stacked fields with live preview card on the right.

---

## 5. Scrape Plan (Chrome MCP)

Since chatgpt.com is blocked from server-side fetches, we drive a real browser tab via Chrome MCP.

1. `navigate` → `https://chatgpt.com/apps` (user must be signed in in their Chrome session).
2. `read_page` with `filter: interactive` to enumerate app link refs across all category tabs. Click each tab (`Featured`, `Lifestyle`, `Productivity`, any others) and collect unique app URLs.
3. For each app, on the detail page (`/apps/{slug}`):
   - **Header:** name, tagline, avatar image URL.
   - **Preview gallery** (three chat-bubble cards at the top): for each bubble capture
     - the prompt text (`@AppName …`),
     - the preview image URL (required),
     - the optional CTA label + URL (e.g. "Open in Photoshop").
     Store as ordered rows in `app_previews`.
   - **Long description** prose paragraph(s).
   - **"Try prompts like this"** bullet list → `example_prompts` JSON array.
   - **Information table** — parse each row into a structured field:
     - Category → `app_categories`
     - Capabilities → `apps.capabilities` (JSON array)
     - Developer → `apps.publisher`
     - Website → `apps.homepage_url`
     - Version → `apps.version`
     - Privacy Policy → `apps.privacy_url`
     - Terms of Service → `apps.terms_url`
     - Customer support → `apps.support_url`
   - `get_page_text` as a fallback when `read_page` can't resolve a specific ref.
4. Persist to a local JSON `seed/chatgpt-apps.json` — one record per app with nested `previews[]` and `information{}` — `source: 'chatgpt_seed'`.
5. Download all media over HTTPS and upload to R2:
   - `avatars/{slug}.png`
   - `previews/{slug}/{n}.jpg`
6. Run a `seed.ts` script that reads the JSON, inserts rows into D1 with `status='published'` and tags them with `source='chatgpt_seed'` so we can distinguish from user submissions.

**Caveats & ethics**
- We're only seeding metadata that's already publicly visible (name, tagline, category). We'll credit the original publisher and link back to their homepage. No proprietary content copied verbatim — descriptions will be rewritten/shortened during ingest.
- Respect robots.txt; throttle navigation to ~1 request / 2 sec.
- Flag every seeded row so we can bulk-update or remove them later if we swap to first-party data.

---

## 6. Submission Flow (Open Form)

Fields:
- **Basics:** name, tagline, long description (markdown), **avatar upload (required)**.
- **Links:** homepage URL, privacy policy URL, terms URL, support URL/email.
- **Metadata (Information table):** developer name, version, capabilities (multi-select: Interactive / Writes / Reads / etc.), category (single-select).
- **Preview bubbles** (repeating, 1–3, **at least one required**): prompt text, **preview image upload (required)**, CTA label, CTA URL.
- **Example prompts** (repeating, up to ~8 short strings).
- **Submitter:** email (optional, for reply).

Server-side on POST `/api/submit`:
1. Cloudflare **Turnstile** captcha verification (free, no user friction).
2. **Zod** schema validation — reject malformed.
3. **Rate limit** by IP via KV: 5 submissions / 24h.
4. Store icon upload to R2 under `submissions/{submission_id}/icon`.
5. Insert row in `apps` with `status='pending'` + audit row in `submissions`.
6. Redirect to `/submit/success`.

Optional Google Form fallback: if you'd rather not build the form UI right away, we can point the Submit button at a Google Form and wire a Cloudflare Worker cron that reads the linked Google Sheet via the Sheets API and upserts into D1. This is cheaper to ship but yields lower-quality data (no image upload, no Turnstile).

---

## 7. Admin Moderation

- Single operator — gate `/admin/*` with HTTP Basic Auth backed by `env.ADMIN_USER` / `env.ADMIN_PASS_HASH` secrets.
- Queue view: pending submissions sorted oldest-first with inline Approve / Reject / Edit.
- Approve = `status='published'`, `published_at=now`, then hit `/_revalidate?path=/&path=/category/*&path=/app/{id}`.
- Reject = status flip + optional note in `submissions.review_notes`.

---

## 8. Deployment & Infra

- **Repo layout**
  ```
  /app              ← vinext App Router
  /components
  /lib/db.ts        ← drizzle client bound to env.DB
  /lib/r2.ts
  /scripts/seed.ts
  /scripts/scrape-chatgpt.ts  ← Chrome MCP orchestration notes
  /migrations/0001_init.sql
  wrangler.toml
  ```
- **wrangler.toml** bindings: `DB` (D1), `BUCKET` (R2), `KV` (KV), `TURNSTILE_SECRET`, `ADMIN_USER`, `ADMIN_PASS_HASH`.
- **Migrations:** `wrangler d1 migrations apply mcpapp`.
- **Domain:** Cloudflare-managed; `mcpapp.dev` or similar (TBD).
- **Cost:** D1 free tier + R2 free egress + Workers free 100k req/day covers early traffic at $0.

---

## 9. Phased Delivery

Six concrete chunks. Each one leaves the site in a shippable state.

**Phase 0 — Scaffolding (½ day)**
Scaffold vinext app, commit `wrangler.toml`, create D1 + R2 + KV, apply migrations, deploy a "hello world" to a `workers.dev` subdomain.

**Phase 1 — Catalog read path (1 day)**
Implement `/`, `/category/[slug]`, `/app/[id]` from D1 with hand-seeded fixtures (5–10 apps). Build `AppCard`, `AppDetail`, `CategoryTabs`, `HeroCarousel`. Responsive + accessible.

**Phase 2 — Scrape + seed (1 day)**
Chrome MCP scrape of chatgpt.com/apps (featured + all categories + detail pages). Normalize to JSON. Upload icons to R2. Run seed script to populate D1. Verify on staging.

**Phase 3 — Submission (1 day)**
Build `/submit` form + `/api/submit` handler. Turnstile. KV rate limit. Upload to R2. Audit table.

**Phase 4 — Admin (½ day)**
`/admin` queue, approve/reject, ISR cache-bust. Basic auth.

**Phase 5 — Polish & SEO (½ day)**
OG image route, sitemap, robots, structured data (JSON-LD `SoftwareApplication`), search page. Lighthouse pass (≥95 all axes).

**Phase 6 — Launch checklist (½ day)**
Copy review, terms/privacy page, 404/500 pages, error boundaries, analytics (CF Web Analytics — cookie-less), RSS feed of newly-published apps.

Total: ~5 working days for v1.

---

## 10. Open Questions Before Coding Begins

1. **Domain** — do you already own one, or should we pick (`mcpdir.app`, `mcp-apps.com`, `mcpstore.dev`…)?
2. **Submission gate** — Turnstile-only open form vs. Google Form fallback. Default to Turnstile; confirm.
3. **Publisher verification** — any v1 badge for verified publishers, or skip until v2?
4. **Search** — D1 FTS5 virtual table from day one, or start with `LIKE` and upgrade later?
5. **Submitter notifications** — do you want email-on-approval via Resend/MailChannels, or skip?
6. **Legal** — Terms/DMCA/takedown wording. I'll draft boilerplate unless you have preferred text.

Reply with answers (or "defaults are fine") and I'll kick off Phase 0.

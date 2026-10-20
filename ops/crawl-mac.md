# Catalog Synchronization

The active schedule is the Codex task `MCPApp 每日数据同步`, daily at
04:00 Asia/Shanghai. It runs in the existing task with the local repository and
the signed-in browser available. The computer must be awake and Codex running.
The old `daily-mcp-app-catalog-crawl` task is no longer installed on this Mac.

## Current Workflow

1. Open the signed-in public `https://chatgpt.com/plugins` home page in Chrome.
   Run `scripts/capture-chatgpt-plugins.js` through the browser console. Save the
   downloaded JSON as `seed/raw-chatgpt-apps.json`. The capture derives current
   category URLs from the page and follows pagination, rejecting repeated pages.
   Never export authentication headers or cookies, Installed, or Personal data.
2. Run `npm run data:sync`. This refreshes ChatGPT, Claude, skills.sh, clients,
   and GitHub/npm discovery. Sources run independently. ChatGPT requires a
   browser capture less than 24 hours old. A stale capture is reported as failed
   and is not imported. Complete categories from a partial capture can be merged;
   unfinished categories are excluded, historical data stays, and the source is
   reported as partial without advancing its full-success timestamp.
3. Read `reports/data-sync.json` for source status, last attempt, last successful
   run, and errors. A partial discovery run retains previous candidates and does
   not advance the full-success timestamp. `npm run data:health` includes these
   results. Generated report time is not proof that an upstream fetch succeeded.
4. Validate ID uniqueness and that all previous app/skill IDs are preserved.
   Check the diff and run typecheck/build before applying seed SQL and deploying.
   Preserve historical records and existing detailed metadata. Discovery entries
   are review candidates, not automatic public listings.
5. Commit/push scoped changes, generate seed SQL, apply to remote D1, deploy,
   refresh public caches, and verify live counts and representative detail pages.
   Report failed sources separately even when other sources update successfully.

`CF_REMOTE_MODE=false npm run crawl:daily` performs local synchronization only.
`npm run crawl:daily` also applies D1 and deploys using existing Cloudflare auth.
The daily script does not capture browser responses itself; the scheduled agent
must perform step 1. A blocked browser must not prevent other sources refreshing.

Current limitation (2026-10-20): Productivity, Finance, Business & Operations,
and Other did not advance with the capture's `page_token` parameter. They were
excluded from this partial import. Resolve the current server pagination contract
before claiming a full ChatGPT directory sync; HTTP 200 alone is insufficient.

## Legacy Webhook Recovery

The Cloudflare Worker cron webhook path has been retired.

Keep this note only as a recovery reference if the Codex automation is paused and the old Worker-to-Mac webhook needs to be restored.

## 1. Start the local webhook

```bash
cd /Users/xuhong/iDev/cloudflare/mcpapp
export CRAWL_WEBHOOK_SECRET="$(openssl rand -hex 32)"
npm run crawl:webhook
```

Health check:

```bash
curl http://127.0.0.1:8789/health
```

## 2. Run it at login with launchd

Edit `ops/com.mcpapp.crawl-webhook.plist.example` and replace `CRAWL_WEBHOOK_SECRET`, then install it:

```bash
cp ops/com.mcpapp.crawl-webhook.plist.example ~/Library/LaunchAgents/com.mcpapp.crawl-webhook.plist
launchctl unload ~/Library/LaunchAgents/com.mcpapp.crawl-webhook.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.mcpapp.crawl-webhook.plist
launchctl start com.mcpapp.crawl-webhook
```

## 3. Expose it with Cloudflare Tunnel

```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared tunnel login
cloudflared tunnel create mcpapp-crawler
cloudflared tunnel route dns mcpapp-crawler crawl.mcpapp.net
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: mcpapp-crawler
credentials-file: /Users/xuhong/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: crawl.mcpapp.net
    service: http://127.0.0.1:8789
  - service: http_status:404
```

Run once:

```bash
cloudflared tunnel run mcpapp-crawler
```

Install the tunnel as a macOS login service:

```bash
cloudflared service install
```

## 4. Point a Worker cron at the Mac

Only do this if a Worker cron trigger and scheduled handler have been restored. Use the same secret from the launchd plist:

```bash
printf 'https://crawl.mcpapp.net/run' | npx wrangler secret put CRAWL_WEBHOOK_URL
printf '<same-secret>' | npx wrangler secret put CRAWL_WEBHOOK_SECRET
```

## 5. Source capture still needs to be added

The current normalizers need these fresh files before the daily job can complete:

- `seed/raw-chatgpt-apps.json`
- `tmp-claude-directory-servers.network-response`
- `tmp-claude-interactive-connectors.json`

Add a Playwright capture script and set:

```bash
export CRAWL_SOURCE_COMMAND="npm run crawl:sources"
```

Without a fresh browser capture, the current daily script records ChatGPT as
failed, retains its existing catalog, and continues refreshing other sources.

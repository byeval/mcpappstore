# Legacy Cloudflare Crawl Webhook

The Cloudflare Worker cron webhook path has been retired. The active daily crawl is now handled by the Codex automation named `daily-mcp-app-catalog-crawl`.

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

Without that source capture step, the webhook and tunnel are connected, but `scripts/daily-crawl.sh` will stop before writing stale data.

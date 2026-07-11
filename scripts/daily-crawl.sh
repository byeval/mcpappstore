#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_file() {
  if [[ ! -s "$1" ]]; then
    log "Missing required source file: $1"
    log "Set CRAWL_SOURCE_COMMAND to capture fresh ChatGPT/Claude network responses before normalization."
    exit 1
  fi
}

has_cloudflare_auth() {
  local whoami_output
  if ! whoami_output="$(npx wrangler whoami 2>&1)"; then
    return 1
  fi

  if grep -Eqi \
    "not authenticated|unable to resolve cloudflare's api hostname|no internet connection|network connectivity issues|dns resolver|firewall or vpn blocking dns requests|error" \
    <<<"$whoami_output"; then
    return 1
  fi

  return 0
}

verify_live_url() {
  local url="$1"
  curl --fail --silent --show-error --location --max-time 20 --output /dev/null "$url"
}

run_step() {
  local label="$1"
  shift

  if "$@"; then
    return 0
  fi

  log "Step failed: $label"
  return 1
}

if [[ -n "${CRAWL_SOURCE_COMMAND:-}" ]]; then
  log "Running source capture command"
  bash -lc "$CRAWL_SOURCE_COMMAND"
fi

require_file "seed/raw-chatgpt-apps.json"
legacy_claude_sources_available=false
if [[ -s "tmp-claude-directory-servers.network-response" && -s "tmp-claude-interactive-connectors.json" ]]; then
  legacy_claude_sources_available=true
else
  log "Legacy Claude network response files are missing; public connector crawl will run as the Claude source."
fi

REMOTE_MODE="${CF_REMOTE_MODE:-force}"
remote_enabled=false

case "$REMOTE_MODE" in
  1|true|yes|on|force)
    if ! has_cloudflare_auth; then
      log "Cloudflare auth required for CF_REMOTE_MODE=$REMOTE_MODE."
      log "Set CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID when Wrangler cannot infer it), or run with CF_REMOTE_MODE=false for a local-only dry run."
      exit 1
    fi
    remote_enabled=true
    ;;
  0|false|no|off)
    remote_enabled=false
    ;;
  auto)
    if has_cloudflare_auth; then
      remote_enabled=true
    fi
    ;;
  *)
    log "Invalid CF_REMOTE_MODE=$REMOTE_MODE (expected auto|true|false)"
    exit 1
    ;;
esac

if [[ "$remote_enabled" == true ]]; then
  log "Cloudflare remote mode enabled"
else
  log "Cloudflare remote mode disabled (CF_REMOTE_MODE=false or auto without auth)"
fi

log "Normalizing ChatGPT catalog"
if [[ "$remote_enabled" == true ]]; then
  npm run scrape -- seed/raw-chatgpt-apps.json seed/chatgpt-apps.json --upload-r2
else
  npm run scrape -- seed/raw-chatgpt-apps.json seed/chatgpt-apps.json --no-upload-r2
fi

if [[ "$legacy_claude_sources_available" == true ]]; then
  log "Merging Claude connectors from legacy network responses"
  npm run scrape:claude -- tmp-claude-directory-servers.network-response tmp-claude-interactive-connectors.json seed/chatgpt-apps.json
fi

log "Merging Claude connectors from public directory"
npm run scrape:claude-connectors -- seed/chatgpt-apps.json tmp-claude-public-connectors.json --cache-on-fail

log "Refreshing skills catalog and candidate report"
npm run skills:refresh -- --skip-seed

log "Generating seed SQL"
npm run seed

if [[ "$remote_enabled" == true ]]; then
  log "Applying skills schema to remote D1"
  run_step "apply skills schema" npx wrangler d1 execute mcpapp --remote --yes --file migrations/0006_skills.sql

  log "Applying seed SQL to remote D1"
  run_step "apply seed sql" npx wrangler d1 execute mcpapp --remote --yes --file migrations/0002_seed.sql

  log "Deploying site"
  run_step "deploy" npm run deploy

  log "Verifying live site"
  run_step "verify mcpapp.net" verify_live_url "https://mcpapp.net/"
  run_step "verify sitemap" verify_live_url "https://mcpapp.net/sitemap.xml"
  run_step "verify robots" verify_live_url "https://mcpapp.net/robots.txt"
else
  log "Skipping remote D1 apply and deploy (no Cloudflare auth)"
fi

log "Daily crawl complete"

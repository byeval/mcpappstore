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
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    return 0
  fi

  local whoami_output
  if ! whoami_output="$(npx wrangler whoami 2>&1)"; then
    return 1
  fi

  if grep -qi "not authenticated" <<<"$whoami_output"; then
    return 1
  fi

  return 0
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
require_file "tmp-claude-directory-servers.network-response"
require_file "tmp-claude-interactive-connectors.json"

REMOTE_MODE="${CF_REMOTE_MODE:-auto}"
remote_enabled=false

case "$REMOTE_MODE" in
  1|true|yes|on|force)
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
  log "Cloudflare remote mode disabled (missing auth or CF_REMOTE_MODE=false)"
fi

log "Normalizing ChatGPT catalog"
if [[ "$remote_enabled" == true ]]; then
  npm run scrape -- seed/raw-chatgpt-apps.json seed/chatgpt-apps.json --upload-r2
else
  npm run scrape -- seed/raw-chatgpt-apps.json seed/chatgpt-apps.json --no-upload-r2
fi

log "Merging Claude connectors"
npm run scrape:claude -- tmp-claude-directory-servers.network-response tmp-claude-interactive-connectors.json seed/chatgpt-apps.json

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
else
  log "Skipping remote D1 apply and deploy (no Cloudflare auth)"
fi

log "Daily crawl complete"

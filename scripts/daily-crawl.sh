#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PREVIOUS_CATALOG="$(mktemp "${TMPDIR:-/tmp}/mcpapp-catalog.XXXXXX")"
PREVIOUS_SKILLS="$(mktemp "${TMPDIR:-/tmp}/mcpapp-skills.XXXXXX")"
cp seed/chatgpt-apps.json "$PREVIOUS_CATALOG"
cp seed/skills.json "$PREVIOUS_SKILLS"
trap 'rm -f "$PREVIOUS_CATALOG" "$PREVIOUS_SKILLS"' EXIT

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
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
  mkdir -p reports
  npx wrangler d1 execute mcpapp --remote --json --command "SELECT id, source, status, updated_at FROM apps WHERE source NOT IN ('chatgpt_seed','claude_seed') ORDER BY id;" > reports/non-seed-before.json
else
  log "Cloudflare remote mode disabled (CF_REMOTE_MODE=false or auto without auth)"
fi

log "Refreshing all data sources (partial failures are recorded in reports/data-sync.json)"
if [[ "$remote_enabled" == true ]]; then
  PROTECTED_APPS_PATH=reports/non-seed-before.json npm run data:sync
else
  npm run data:sync
fi
npm run check

if [[ "$remote_enabled" == true ]]; then
  log "Validating production build"
  run_step "build" npm run build

  log "Applying skills schema to remote D1"
  run_step "apply skills schema" npx wrangler d1 execute mcpapp --remote --yes --file migrations/0006_skills.sql

  log "Applying seed SQL to remote D1"
  run_step "apply seed sql" npx wrangler d1 execute mcpapp --remote --yes --file migrations/0002_seed.sql

  log "Deploying site"
  run_step "deploy" npm run deploy

  log "Refreshing public catalog caches"
  run_step "refresh caches" npx wrangler kv bulk delete reports/public-cache-keys.json --binding KV --remote --force

  log "Verifying live site"
  run_step "verify mcpapp.net" verify_live_url "https://mcpapp.net/"
  run_step "verify sitemap" verify_live_url "https://mcpapp.net/sitemap.xml"
  run_step "verify robots" verify_live_url "https://mcpapp.net/robots.txt"

  log "Notifying IndexNow about changed public URLs"
  run_step "notify IndexNow" npm run indexnow:submit -- --before "$PREVIOUS_CATALOG" --before-skills "$PREVIOUS_SKILLS"
else
  log "Skipping remote D1 apply and deploy (no Cloudflare auth)"
fi

log "Daily crawl complete"

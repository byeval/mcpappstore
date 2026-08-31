#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${SEO_SMOKE_PORT:-3001}"
BASE_URL="http://localhost:${PORT}"
SMOKE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mcpapp-seo-smoke.XXXXXX")"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$SMOKE_DIR"
}
trap cleanup EXIT

npm run dev -- --port "$PORT" >"$SMOKE_DIR/server.log" 2>&1 &
SERVER_PID="$!"

for _ in {1..30}; do
  if curl --fail --silent --show-error --max-time 2 "$BASE_URL/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat "$SMOKE_DIR/server.log"
    exit 1
  fi
  sleep 1
done

curl --fail --silent --show-error "$BASE_URL/app/microsoft-365" >"$SMOKE_DIR/en.html"
curl --fail --silent --show-error "$BASE_URL/es/app/microsoft-365" >"$SMOKE_DIR/es.html"
curl --fail --silent --show-error "$BASE_URL/zh-hans/app/microsoft-365" >"$SMOKE_DIR/zh.html"
curl --fail --silent --show-error -H "Accept-Language: zh-CN" "$BASE_URL/app/microsoft-365" >"$SMOKE_DIR/header-locale.html"
curl --silent --show-error --output /dev/null --write-out '%{http_code} %{redirect_url}' \
  "$BASE_URL/en/app/microsoft-365" >"$SMOKE_DIR/en-prefix.redirect"

rg --quiet '<html[^>]+lang="en"' "$SMOKE_DIR/en.html"
rg --quiet '<title>Microsoft 365: MCP for Claude · Anthropic \| MCP App Store</title>' "$SMOKE_DIR/en.html"
rg --quiet '<html[^>]+lang="es"' "$SMOKE_DIR/es.html"
rg --quiet '<title>Microsoft 365: MCP para Claude · Anthropic \| MCP App Store</title>' "$SMOKE_DIR/es.html"
rg --quiet '<html[^>]+lang="zh-Hans"' "$SMOKE_DIR/zh.html"
rg --quiet '<title>Microsoft 365：Claude MCP 应用 · Anthropic \| MCP 应用商店</title>' "$SMOKE_DIR/zh.html"
rg --quiet '<html[^>]+lang="en"' "$SMOKE_DIR/header-locale.html"
rg --quiet "^308 ${BASE_URL}/app/microsoft-365$" "$SMOKE_DIR/en-prefix.redirect"

echo "SEO smoke passed: stable locale paths, localized metadata, and /en canonical redirect verified."

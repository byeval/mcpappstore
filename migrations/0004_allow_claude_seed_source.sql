PRAGMA foreign_keys = off;

DROP TABLE IF EXISTS apps_source_upgrade;

CREATE TABLE apps_source_upgrade (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT,
  icon_key TEXT,
  hero_key TEXT,
  homepage_url TEXT,
  repo_url TEXT,
  mcp_endpoint TEXT,
  mcp_transport TEXT CHECK(mcp_transport IN ('stdio', 'sse', 'http')),
  install_cmd TEXT,
  auth_type TEXT,
  publisher TEXT,
  publisher_url TEXT,
  capabilities TEXT,
  version TEXT,
  privacy_url TEXT,
  terms_url TEXT,
  support_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'published', 'rejected', 'hidden')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  example_prompts TEXT,
  source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'chatgpt_seed', 'claude_seed', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

INSERT INTO apps_source_upgrade (
  id, name, tagline, description, icon_key, hero_key, homepage_url, repo_url,
  mcp_endpoint, mcp_transport, install_cmd, auth_type, publisher, publisher_url,
  capabilities, version, privacy_url, terms_url, support_url,
  status, is_featured, example_prompts, source, created_at, updated_at, published_at
)
SELECT
  id, name, tagline, description, icon_key, hero_key, homepage_url, repo_url,
  mcp_endpoint, mcp_transport, install_cmd, auth_type, publisher, publisher_url,
  capabilities, version, privacy_url, terms_url, support_url,
  status, is_featured, example_prompts, source, created_at, updated_at, published_at
FROM apps;

DROP TABLE apps;
ALTER TABLE apps_source_upgrade RENAME TO apps;

CREATE INDEX IF NOT EXISTS idx_apps_status_featured
  ON apps(status, is_featured DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_publisher ON apps(publisher);

PRAGMA foreign_keys = on;

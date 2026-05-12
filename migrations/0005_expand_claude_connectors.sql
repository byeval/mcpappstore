PRAGMA foreign_keys = off;

DROP TABLE IF EXISTS app_surfaces_upgrade;

CREATE TABLE app_surfaces_upgrade (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('chatgpt', 'claude')),
  surface_type TEXT NOT NULL CHECK(surface_type IN ('app', 'connector', 'interactive_connector')),
  display_name TEXT,
  tagline TEXT,
  description TEXT,
  surface_url TEXT,
  external_id TEXT NOT NULL DEFAULT '',
  mcp_endpoint TEXT,
  mcp_transport TEXT CHECK(mcp_transport IN ('stdio', 'sse', 'http')),
  install_cmd TEXT,
  auth_type TEXT,
  capabilities TEXT,
  example_prompts TEXT,
  tools TEXT,
  previews TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'pending', 'unknown')),
  PRIMARY KEY (app_id, platform, surface_type, external_id)
);

INSERT OR REPLACE INTO app_surfaces_upgrade (
  app_id, platform, surface_type, display_name, tagline, description, surface_url, external_id,
  mcp_endpoint, mcp_transport, install_cmd, auth_type, capabilities, example_prompts, tools, previews,
  is_primary, status
)
SELECT
  app_id,
  platform,
  surface_type,
  display_name,
  tagline,
  description,
  surface_url,
  COALESCE(external_id, ''),
  mcp_endpoint,
  mcp_transport,
  install_cmd,
  auth_type,
  capabilities,
  example_prompts,
  tools,
  previews,
  is_primary,
  status
FROM app_surfaces;

DROP TABLE app_surfaces;
ALTER TABLE app_surfaces_upgrade RENAME TO app_surfaces;

CREATE INDEX IF NOT EXISTS idx_app_surfaces_platform
  ON app_surfaces(platform, surface_type, status);

PRAGMA foreign_keys = on;


CREATE TABLE IF NOT EXISTS app_surfaces (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('chatgpt', 'claude')),
  surface_type TEXT NOT NULL CHECK(surface_type IN ('app', 'connector', 'interactive_connector')),
  display_name TEXT,
  surface_url TEXT,
  external_id TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'pending', 'unknown')),
  PRIMARY KEY (app_id, platform, surface_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_app_surfaces_platform
  ON app_surfaces(platform, surface_type, status);

INSERT OR IGNORE INTO app_surfaces (
  app_id, platform, surface_type, display_name, surface_url, is_primary, status
)
SELECT
  id,
  CASE WHEN source = 'claude_seed' THEN 'claude' ELSE 'chatgpt' END,
  CASE WHEN source = 'claude_seed' THEN 'connector' ELSE 'app' END,
  name,
  homepage_url,
  1,
  'available'
FROM apps;

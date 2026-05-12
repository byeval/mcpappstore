CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'external'
    CHECK(source_type IN ('local', 'bundled', 'external')),
  source_url TEXT,
  install_url TEXT,
  skill_path TEXT,
  platforms TEXT,
  categories TEXT,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available', 'pending', 'unknown')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status, display_name);

CREATE TABLE IF NOT EXISTS app_skills (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'recommended'
    CHECK(relation_type IN ('recommended', 'required', 'related')),
  reason TEXT,
  confidence REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (app_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_app_skills_skill ON app_skills(skill_id, relation_type);

CREATE TABLE IF NOT EXISTS surface_skills (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('chatgpt', 'claude')),
  surface_type TEXT NOT NULL CHECK(surface_type IN ('app', 'connector', 'interactive_connector')),
  external_id TEXT NOT NULL DEFAULT '',
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'recommended'
    CHECK(relation_type IN ('recommended', 'required', 'related')),
  reason TEXT,
  confidence REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (app_id, platform, surface_type, external_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_surface_skills_skill ON surface_skills(skill_id, relation_type);

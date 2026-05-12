CREATE TABLE apps (
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

CREATE INDEX idx_apps_status_featured
  ON apps(status, is_featured DESC, published_at DESC);
CREATE INDEX idx_apps_publisher ON apps(publisher);

CREATE TABLE app_surfaces (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('chatgpt', 'claude')),
  surface_type TEXT NOT NULL CHECK(surface_type IN ('app', 'connector', 'interactive_connector')),
  display_name TEXT,
  tagline TEXT,
  description TEXT,
  surface_url TEXT,
  external_id TEXT,
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

CREATE INDEX idx_app_surfaces_platform
  ON app_surfaces(platform, surface_type, status);

CREATE TABLE skills (
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

CREATE INDEX idx_skills_status ON skills(status, display_name);

CREATE TABLE app_skills (
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

CREATE INDEX idx_app_skills_skill ON app_skills(skill_id, relation_type);

CREATE TABLE surface_skills (
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

CREATE INDEX idx_surface_skills_skill ON surface_skills(skill_id, relation_type);

CREATE TABLE categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE app_categories (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  PRIMARY KEY (app_id, category_slug)
);

CREATE TABLE app_tools (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (app_id, tool_name)
);

CREATE TABLE app_previews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  sort INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  caption TEXT,
  image_key TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT
);

CREATE INDEX idx_previews_app_sort ON app_previews(app_id, sort);

CREATE TABLE tags (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE app_tags (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL REFERENCES tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (app_id, tag_slug)
);

CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT REFERENCES apps(id) ON DELETE SET NULL,
  submitter_email TEXT,
  submitter_ip TEXT,
  raw_payload TEXT NOT NULL,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at INTEGER NOT NULL
);

-- Local migration; deployment must apply before enabling Astro publication or moderation.
CREATE TABLE IF NOT EXISTS astro_publication_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('ready', 'updating', 'failed')),
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO astro_publication_state(id, revision, phase, updated_at)
VALUES (1, lower(hex(randomblob(16))), 'ready', unixepoch() * 1000);

-- Content freshness is independent of publication ownership. Apply before enabling the front.
-- Every public-table write, including uncoordinated imports, invalidates static artifacts and caches.
ALTER TABLE astro_publication_state ADD COLUMN content_revision TEXT NOT NULL DEFAULT '';
UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
CREATE TRIGGER astro_content_apps_insert AFTER INSERT ON apps
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_apps_update AFTER UPDATE ON apps
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_apps_delete AFTER DELETE ON apps
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_categories_insert AFTER INSERT ON categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_categories_update AFTER UPDATE ON categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_categories_delete AFTER DELETE ON categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_categories_insert AFTER INSERT ON app_categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_categories_update AFTER UPDATE ON app_categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_categories_delete AFTER DELETE ON app_categories
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_previews_insert AFTER INSERT ON app_previews
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_previews_update AFTER UPDATE ON app_previews
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_previews_delete AFTER DELETE ON app_previews
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_surfaces_insert AFTER INSERT ON app_surfaces
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_surfaces_update AFTER UPDATE ON app_surfaces
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_surfaces_delete AFTER DELETE ON app_surfaces
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tools_insert AFTER INSERT ON app_tools
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tools_update AFTER UPDATE ON app_tools
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tools_delete AFTER DELETE ON app_tools
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_tags_insert AFTER INSERT ON tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_tags_update AFTER UPDATE ON tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_tags_delete AFTER DELETE ON tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tags_insert AFTER INSERT ON app_tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tags_update AFTER UPDATE ON app_tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_tags_delete AFTER DELETE ON app_tags
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_skills_insert AFTER INSERT ON skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_skills_update AFTER UPDATE ON skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_skills_delete AFTER DELETE ON skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_skills_insert AFTER INSERT ON app_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_skills_update AFTER UPDATE ON app_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_app_skills_delete AFTER DELETE ON app_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_surface_skills_insert AFTER INSERT ON surface_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_surface_skills_update AFTER UPDATE ON surface_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;
CREATE TRIGGER astro_content_surface_skills_delete AFTER DELETE ON surface_skills
BEGIN
  UPDATE astro_publication_state SET content_revision = lower(hex(randomblob(16))) WHERE id = 1;
END;

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import skillAssociations from "../seed/app-skill-associations.json" with { type: "json" };
import catalog from "../seed/chatgpt-apps.json" with { type: "json" };
import skillRegistry from "../seed/skills.json" with { type: "json" };
import type { SeedCatalog, SeedSkillAssociation, SeedSkillRegistry } from "../lib/types";

const data = catalog as SeedCatalog;
const skills = skillRegistry as SeedSkillRegistry;
const associations = skillAssociations as SeedSkillAssociation[];
const outputPath = resolve(process.cwd(), process.argv[2] ?? "migrations/0002_seed.sql");
const skillSeedTimestamp = Math.max(...data.apps.map((app) => app.updatedAt), 0);

function escapeSql(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${value.replace(/[ \t]+(?=\r?\n)/g, "").replaceAll("'", "''")}'`;
}

function json(value: unknown): string {
  return escapeSql(JSON.stringify(value));
}

const statements: string[] = [];
const seededAppFilter = "(SELECT id FROM apps WHERE source IN ('chatgpt_seed', 'claude_seed'))";

statements.push(`DELETE FROM app_skills WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM surface_skills WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM app_previews WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM app_tools WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM app_tags WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM app_categories WHERE app_id IN ${seededAppFilter};`);
statements.push(`DELETE FROM app_surfaces WHERE app_id IN ${seededAppFilter};`);
statements.push("DELETE FROM apps WHERE source IN ('chatgpt_seed', 'claude_seed');");

for (const skill of skills.skills) {
  statements.push(
    `INSERT OR REPLACE INTO skills (
      id, name, display_name, description, source_type, source_url, install_url, skill_path,
      platforms, categories, tags, status, created_at, updated_at
    ) VALUES (
      ${escapeSql(skill.id)},
      ${escapeSql(skill.name)},
      ${escapeSql(skill.displayName)},
      ${escapeSql(skill.description)},
      ${escapeSql(skill.sourceType)},
      ${escapeSql(skill.sourceUrl)},
      ${escapeSql(skill.installUrl)},
      ${escapeSql(skill.skillPath)},
      ${skill.platforms ? json(skill.platforms) : "NULL"},
      ${json(skill.categories)},
      ${json(skill.tags)},
      ${escapeSql(skill.status)},
      ${skillSeedTimestamp},
      ${skillSeedTimestamp}
    );`,
  );
}

for (const category of data.categories) {
  statements.push(
    `INSERT OR REPLACE INTO categories (slug, name, sort) VALUES (${escapeSql(category.slug)}, ${escapeSql(category.name)}, ${category.sort});`,
  );
}

for (const app of data.apps) {
  statements.push(
    `INSERT OR REPLACE INTO apps (
      id, name, tagline, description, icon_key, hero_key, homepage_url, repo_url,
      mcp_endpoint, mcp_transport, install_cmd, auth_type, publisher, publisher_url,
      capabilities, version, privacy_url, terms_url, support_url,
      status, is_featured, example_prompts, source, created_at, updated_at, published_at
    ) VALUES (
      ${escapeSql(app.id)},
      ${escapeSql(app.name)},
      ${escapeSql(app.tagline)},
      ${escapeSql(app.description)},
      ${escapeSql(app.iconKey)},
      ${escapeSql(app.heroKey)},
      ${escapeSql(app.homepageUrl)},
      ${escapeSql(app.repoUrl)},
      ${escapeSql(app.mcpEndpoint)},
      ${escapeSql(app.mcpTransport)},
      ${escapeSql(app.installCmd)},
      ${escapeSql(app.authType)},
      ${escapeSql(app.publisher)},
      ${escapeSql(app.publisherUrl)},
      ${json(app.capabilities)},
      ${escapeSql(app.version)},
      ${escapeSql(app.privacyUrl)},
      ${escapeSql(app.termsUrl)},
      ${escapeSql(app.supportUrl)},
      ${escapeSql(app.status)},
      ${app.isFeatured ? 1 : 0},
      ${json(app.examplePrompts)},
      ${escapeSql(app.source)},
      ${app.createdAt},
      ${app.updatedAt},
      ${app.publishedAt ?? "NULL"}
    );`,
  );

  for (const category of app.categories) {
    statements.push(
      `INSERT OR REPLACE INTO app_categories (app_id, category_slug) VALUES (${escapeSql(app.id)}, ${escapeSql(category)});`,
    );
  }

  for (const [index, surface] of app.surfaces.entries()) {
    statements.push(
      `INSERT OR REPLACE INTO app_surfaces (
        app_id, platform, surface_type, display_name, tagline, description, surface_url, external_id,
        mcp_endpoint, mcp_transport, install_cmd, auth_type, capabilities, example_prompts, tools, previews,
        is_primary, status
      ) VALUES (
        ${escapeSql(app.id)},
        ${escapeSql(surface.platform)},
        ${escapeSql(surface.type)},
        ${escapeSql(surface.displayName ?? app.name)},
        ${escapeSql(surface.tagline)},
        ${escapeSql(surface.description)},
        ${escapeSql(surface.url)},
        ${escapeSql(surface.externalId ?? "")},
        ${escapeSql(surface.mcpEndpoint)},
        ${escapeSql(surface.mcpTransport)},
        ${escapeSql(surface.installCmd)},
        ${escapeSql(surface.authType)},
        ${surface.capabilities ? json(surface.capabilities) : "NULL"},
        ${surface.examplePrompts ? json(surface.examplePrompts) : "NULL"},
        ${surface.tools ? json(surface.tools) : "NULL"},
        ${surface.previews ? json(surface.previews) : "NULL"},
        ${surface.isPrimary || index === 0 ? 1 : 0},
        ${escapeSql(surface.status)}
      );`,
    );
  }

  for (const tag of app.tags) {
    statements.push(
      `INSERT OR IGNORE INTO tags (slug, name) VALUES (${escapeSql(tag)}, ${escapeSql(tag.replaceAll("-", " "))});`,
    );
    statements.push(
      `INSERT OR REPLACE INTO app_tags (app_id, tag_slug) VALUES (${escapeSql(app.id)}, ${escapeSql(tag)});`,
    );
  }

  for (const tool of app.tools) {
    statements.push(
      `INSERT OR REPLACE INTO app_tools (app_id, tool_name, description) VALUES (${escapeSql(app.id)}, ${escapeSql(tool.name)}, ${escapeSql(tool.description)});`,
    );
  }

  for (const preview of app.previews) {
    statements.push(
      `INSERT INTO app_previews (app_id, sort, prompt, caption, image_key, cta_label, cta_url) VALUES (${escapeSql(app.id)}, ${preview.sort}, ${escapeSql(preview.prompt)}, ${escapeSql(preview.caption)}, ${escapeSql(preview.imageKey)}, ${escapeSql(preview.ctaLabel)}, ${escapeSql(preview.ctaUrl)});`,
    );
  }
}

const appIds = new Set(data.apps.map((app) => app.id));
const skillIds = new Set(skills.skills.map((skill) => skill.id));

for (const association of associations) {
  if (!appIds.has(association.appId) || !skillIds.has(association.skillId)) {
    continue;
  }

  if (association.surface) {
    statements.push(
      `INSERT OR REPLACE INTO surface_skills (
        app_id, platform, surface_type, external_id, skill_id, relation_type, reason, confidence, created_at, updated_at
      ) VALUES (
        ${escapeSql(association.appId)},
        ${escapeSql(association.surface.platform)},
        ${escapeSql(association.surface.type)},
        ${escapeSql(association.surface.externalId ?? "")},
        ${escapeSql(association.skillId)},
        ${escapeSql(association.relationType)},
        ${escapeSql(association.reason)},
        ${association.confidence ?? "NULL"},
        ${skillSeedTimestamp},
        ${skillSeedTimestamp}
      );`,
    );
    continue;
  }

  statements.push(
    `INSERT OR REPLACE INTO app_skills (
      app_id, skill_id, relation_type, reason, confidence, created_at, updated_at
    ) VALUES (
      ${escapeSql(association.appId)},
      ${escapeSql(association.skillId)},
      ${escapeSql(association.relationType)},
      ${escapeSql(association.reason)},
      ${association.confidence ?? "NULL"},
      ${skillSeedTimestamp},
      ${skillSeedTimestamp}
    );`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${statements.join("\n")}\n`, "utf8");

console.log(`Wrote seed SQL to ${outputPath}`);

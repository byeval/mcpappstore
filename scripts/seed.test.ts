import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("seed updates preserve parent rows, user links, and historical associations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-seed-test-"));
  const database = join(dir, "test.sqlite");
  const sqlPath = join(dir, "seed.sql");
  const catalog = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
  const registry = JSON.parse(await readFile("seed/skills.json", "utf8"));
  const app = catalog.apps.find((item: { source: string }) => item.source === "chatgpt_seed");
  const skill = registry.skills[0];
  const category = catalog.categories[0];
  const associations = JSON.parse(await readFile("seed/app-skill-associations.json", "utf8"));
  const association = associations.find((item: { appId: string; skillId: string; surface?: unknown }) =>
    !item.surface && catalog.apps.some((app: { id: string }) => app.id === item.appId) &&
    registry.skills.some((skill: { id: string }) => skill.id === item.skillId));
  assert.ok(association, "an existing seed association is required");
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  execFileSync("sqlite3", [database], { input: `
    PRAGMA foreign_keys = ON;
    ${await readFile("migrations/0001_init.sql", "utf8")}
    INSERT INTO apps (id,name,tagline,source,created_at,updated_at) VALUES
      (${quote(app.id)},'Old seed','Old','chatgpt_seed',123,123),
      ('__user','User details','Kept','user',123,123),
      ('__historical','Historic seed','Kept','claude_seed',123,123);
    INSERT INTO categories VALUES (${quote(category.slug)},'Old category',0);
    INSERT INTO skills (id,name,display_name,description,created_at,updated_at) VALUES
      (${quote(skill.id)},'Old','Old','Old',123,123),
      ('__historic_skill','Historic','Historic','Kept',123,123);
    INSERT INTO app_categories VALUES ('__user',${quote(category.slug)}), ('__historical',${quote(category.slug)});
    INSERT INTO app_skills (app_id,skill_id,created_at,updated_at) VALUES
      ('__user',${quote(skill.id)},123,123),
      (${quote(app.id)},'__historic_skill',123,123);
    INSERT INTO surface_skills (app_id,platform,surface_type,skill_id,created_at,updated_at) VALUES
      ('__user','claude','connector',${quote(skill.id)},123,123),
      (${quote(app.id)},'chatgpt','app','__historic_skill',123,123);
    INSERT INTO submissions (app_id,raw_payload,created_at) VALUES (${quote(app.id)},'{}',123);
    INSERT OR IGNORE INTO apps (id,name,tagline,source,created_at,updated_at) VALUES
      (${quote(association.appId)},'Existing','Existing','chatgpt_seed',123,123);
    INSERT OR IGNORE INTO skills (id,name,display_name,description,created_at,updated_at) VALUES
      (${quote(association.skillId)},'Existing','Existing','Existing',123,123);
    INSERT INTO app_skills (app_id,skill_id,relation_type,reason,confidence,created_at,updated_at) VALUES
      (${quote(association.appId)},${quote(association.skillId)},${quote(association.relationType)},
       ${association.reason == null ? "NULL" : quote(association.reason)},${association.confidence ?? "NULL"},125,126);
  ` });
  execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts", sqlPath], { stdio: "pipe" });
  const seedSql = await readFile(sqlPath, "utf8");
  for (const line of seedSql.split("\n").filter((line) => line.startsWith("DELETE FROM"))) {
    assert.ok(Buffer.byteLength(line) < 100_000, "cleanup must fit the D1 statement limit");
  }
  execFileSync("sqlite3", [database], { input: `PRAGMA foreign_keys = ON;\nBEGIN;\n${seedSql}\nCOMMIT;` });
  const query = (sql: string) => execFileSync("sqlite3", ["-json", database, sql], { encoding: "utf8" }).trim();
  const scalar = (sql: string) => Object.values(JSON.parse(query(sql))[0])[0];
  assert.equal(scalar("SELECT name FROM apps WHERE id = '__user'"), "User details");
  assert.equal(scalar("SELECT count(*) FROM apps WHERE id = '__historical'"), 1);
  assert.equal(scalar("SELECT count(*) FROM app_categories WHERE app_id = '__user'"), 1);
  assert.equal(scalar("SELECT count(*) FROM app_categories WHERE app_id = '__historical'"), 1);
  assert.equal(scalar("SELECT count(*) FROM app_skills WHERE app_id = '__user' OR skill_id = '__historic_skill'"), 2);
  assert.equal(scalar("SELECT count(*) FROM surface_skills WHERE app_id = '__user' OR skill_id = '__historic_skill'"), 2);
  assert.equal(scalar("SELECT app_id FROM submissions"), app.id);
  assert.equal(scalar(`SELECT created_at FROM apps WHERE id = ${quote(app.id)}`), 123);
  assert.equal(scalar(`SELECT created_at FROM skills WHERE id = ${quote(skill.id)}`), 123);
  assert.equal(scalar(`SELECT created_at FROM app_skills WHERE app_id = ${quote(association.appId)} AND skill_id = ${quote(association.skillId)}`), 125);
  assert.equal(scalar(`SELECT updated_at FROM app_skills WHERE app_id = ${quote(association.appId)} AND skill_id = ${quote(association.skillId)}`), 126);
  execFileSync("sqlite3", [database], { input: `
    BEGIN;
    UPDATE app_skills SET reason = 'Outdated association reason'
      WHERE app_id = ${quote(association.appId)} AND skill_id = ${quote(association.skillId)};
    ${seedSql}
    COMMIT;
  ` });
  assert.equal(scalar(`SELECT created_at FROM app_skills WHERE app_id = ${quote(association.appId)} AND skill_id = ${quote(association.skillId)}`), 125);
  assert.ok(Number(scalar(`SELECT updated_at FROM app_skills WHERE app_id = ${quote(association.appId)} AND skill_id = ${quote(association.skillId)}`)) > 126);
  assert.equal(query("PRAGMA foreign_key_check"), "");
});

test("skills-only seed preserves all app data and associations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-skills-seed-test-"));
  const database = join(dir, "test.sqlite");
  const sqlPath = join(dir, "skills.sql");
  const catalog = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
  const registry = JSON.parse(await readFile("seed/skills.json", "utf8"));
  const app = catalog.apps.find((item: { source: string }) => item.source === "chatgpt_seed");
  const skill = registry.skills[0];
  const category = catalog.categories[0];
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  execFileSync("sqlite3", [database], { input: `
    PRAGMA foreign_keys = ON;
    ${await readFile("migrations/0001_init.sql", "utf8")}
    INSERT INTO apps (id,name,tagline,source,created_at,updated_at) VALUES
      (${quote(app.id)},'Keep app','Keep tagline','chatgpt_seed',123,124);
    INSERT INTO categories VALUES (${quote(category.slug)},'Keep category',7);
    INSERT INTO app_categories VALUES (${quote(app.id)},${quote(category.slug)});
    INSERT INTO app_tools VALUES (${quote(app.id)},'keep-tool','Keep description');
    INSERT INTO app_surfaces (app_id,platform,surface_type,external_id) VALUES
      (${quote(app.id)},'chatgpt','app','manual');
    INSERT INTO skills (id,name,display_name,description,created_at,updated_at) VALUES
      (${quote(skill.id)},'Old','Old','Old',123,124),
      ('__historical_skill','Historic','Historic','Keep',123,124);
    INSERT INTO app_skills (app_id,skill_id,reason,created_at,updated_at) VALUES
      (${quote(app.id)},${quote(skill.id)},'Keep reason',123,124);
    INSERT INTO surface_skills (app_id,platform,surface_type,external_id,skill_id,created_at,updated_at) VALUES
      (${quote(app.id)},'chatgpt','app','manual',${quote(skill.id)},123,124);
    INSERT INTO submissions (app_id,raw_payload,created_at) VALUES (${quote(app.id)},'{}',123);
  ` });
  const query = (sql: string) => execFileSync("sqlite3", ["-json", database, sql], { encoding: "utf8" }).trim();
  const tables = ["apps", "categories", "app_categories", "app_tools", "app_surfaces", "app_previews", "app_tags", "tags", "app_skills", "surface_skills", "submissions"];
  const snapshot = () => tables.map((table) => query(`SELECT * FROM ${table}`));
  const before = snapshot();
  assert.throws(() => execFileSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), resolve("scripts/seed.ts"), "--skills-only",
  ], { cwd: dir, stdio: "pipe" }), /requires an explicit output path/);
  execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts", "--skills-only", sqlPath], { stdio: "pipe" });
  const sql = await readFile(sqlPath, "utf8");
  assert.doesNotMatch(sql, /^DELETE FROM/m);
  execFileSync("sqlite3", [database], { input: `PRAGMA foreign_keys = ON;\nBEGIN;\n${sql}\nCOMMIT;` });
  assert.deepEqual(snapshot(), before);
  assert.equal(JSON.parse(query(`SELECT name,created_at FROM skills WHERE id = ${quote(skill.id)}`))[0].name, skill.name);
  assert.equal(JSON.parse(query(`SELECT created_at FROM skills WHERE id = ${quote(skill.id)}`))[0].created_at, 123);
  assert.equal(JSON.parse(query("SELECT count(*) AS total FROM skills"))[0].total, registry.skills.length + 1);
  assert.equal(query("PRAGMA foreign_key_check"), "");
});

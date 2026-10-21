import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  assert.equal(query("PRAGMA foreign_key_check"), "");
});

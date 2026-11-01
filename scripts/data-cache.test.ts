import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("skill-list fallback stays uncached and a later request recovers database-only skills", async () => {
  const source = ts.createSourceFile("data.ts", await readFile(new URL("../lib/data.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "listSkills");
  assert.ok(declaration);
  // Isolate the real cache policy without loading Worker bindings or production data.
  const code = ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified, declaration, source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  type Skill = { id: string };
  let cached: Skill[] | null = null;
  let databaseSkills: Skill[] | null = null;
  let reads = 0;
  const writes: Array<{ key: string; value: Skill[] }> = [];
  const sandbox = {
    exports: {},
    readPublicCache: async () => cached,
    writePublicCache: async (key: string, value: Skill[]) => { writes.push({ key, value }); cached = value; },
    listSkillsFromDb: async () => { reads += 1; return databaseSkills; },
    FALLBACK_SKILL_REGISTRY: { skills: [{ id: "seed-skill" }] },
    cloneSkill: (skill: Skill) => ({ ...skill }),
    sortSkills: (skills: Skill[]) => skills,
  };
  runInNewContext(code, sandbox);
  const listSkills = (sandbox.exports as { listSkills: () => Promise<Skill[]> }).listSkills;
  assert.equal((await listSkills()).map((skill) => skill.id).join(","), "seed-skill");
  assert.equal(writes.length, 0);
  databaseSkills = [{ id: "seed-skill" }, { id: "database-only-skill" }];
  assert.equal(await listSkills(), databaseSkills);
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.key, "skills");
  assert.equal(await listSkills(), databaseSkills);
  assert.equal(reads, 2);
});

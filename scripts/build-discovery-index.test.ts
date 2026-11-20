import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/build-discovery-index.ts");
const firstSeen = "2026-01-01T00:00:00.000Z";
const repo = (name: string) => ({
  full_name: name, html_url: `https://github.com/${name}`, description: "Model Context Protocol MCP server",
  stargazers_count: 200, forks_count: 20, topics: ["mcp-server"], language: "TypeScript",
  pushed_at: firstSeen, updated_at: firstSeen, license: { spdx_id: "MIT" },
});

async function fixture(repos = [repo("example/current")]) {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-candidate-history-"));
  await writeFile(join(dir, "seed.json"), JSON.stringify({ apps: [], categories: [] }));
  await writeFile(join(dir, "github.json"), JSON.stringify({ generatedAt: firstSeen, queries: [], totalCount: repos.length, repos }));
  await writeFile(join(dir, "npm.json"), JSON.stringify({ generatedAt: firstSeen, queries: [], totalCount: 0, packages: [] }));
  const run = () => spawnSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), script, "--seed", "seed.json", "--github", "github.json",
    "--npm", "npm.json", "--output", "index.json", "--report", "index.md",
  ], { cwd: dir, encoding: "utf8", timeout: 30000 });
  const index = async () => JSON.parse(await readFile(join(dir, "index.json"), "utf8"));
  return { dir, run, index };
}

test("candidate index retains absent history and original discovery time", async () => {
  const f = await fixture();
  const first = f.run();
  assert.equal(first.status, 0, first.stderr);
  const before = await f.index();
  before.candidates[0].discoveredAt = firstSeen;
  const historical = { ...before.candidates[0], id: "github:example-historical", sourceId: "example/historical", name: "Historical", url: "https://github.com/example/historical", repoUrl: "https://github.com/example/historical", description: "Retain this historical description and metadata" };
  before.candidates.push(historical);
  await writeFile(join(f.dir, "index.json"), JSON.stringify(before));
  const next = f.run();
  assert.equal(next.status, 0, next.stderr);
  const after = await f.index();
  assert.equal(after.stats.totalCandidates, 2);
  assert.equal(after.candidates.find((c: { id: string }) => c.id === "github:example-current").discoveredAt, firstSeen);
  assert.deepEqual(after.candidates.find((c: { id: string }) => c.id === historical.id), historical);
  assert.equal(after.sources[0].retainedOutsideCurrentWindow, 1);
  assert.equal(new Set(after.candidates.map((c: { id: string }) => c.id)).size, 2);
});

test("candidate index supports a missing previous index", async () => {
  const f = await fixture();
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal((await f.index()).stats.totalCandidates, 1);
});

test("invalid previous candidate index is not overwritten", async () => {
  const f = await fixture();
  await writeFile(join(f.dir, "index.json"), "{invalid");
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(f.dir, "index.json"), "utf8"), "{invalid");
});

test("incoming slug collisions stop instead of dropping a candidate", async () => {
  const f = await fixture([repo("example/a-current"), repo("example-a/current")]);
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate incoming candidate ID/);
});

test("legacy ID collisions retain source spellings without renaming", async () => {
  const f = await fixture();
  assert.equal(f.run().status, 0);
  const before = await f.index();
  const historical = { ...before.candidates[0], sourceId: "example/Current", name: "Legacy lead", discoveredAt: firstSeen };
  before.candidates.push(historical);
  await writeFile(join(f.dir, "index.json"), JSON.stringify(before));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const after = await f.index();
  assert.equal(after.stats.totalCandidates, 2);
  assert.deepEqual(after.candidates.find((c: { sourceId: string }) => c.sourceId === historical.sourceId), historical);
  assert.equal(after.candidates.filter((c: { id: string }) => c.id === historical.id).length, 2);
});

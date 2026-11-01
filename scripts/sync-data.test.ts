import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("sync rejects an already synchronized capture even within 24 hours", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-sync-test-"));
  for (const path of ["seed", "reports", "lib", "bin"]) await mkdir(join(dir, path));
  const lastSuccessAt = new Date(Date.now() - 60_000).toISOString();
  await writeFile(join(dir, "reports/data-sync.json"), JSON.stringify({
    sources: { chatgpt: { status: "ok", lastSuccessAt, message: "Prior real success" } },
  }));
  await writeFile(join(dir, "seed/raw-chatgpt-apps.json"), JSON.stringify({
    capturedAt: new Date(Date.now() - 300_000).toISOString(),
    categories: { productivity: { status: 200, complete: true, data: { plugins: [], pagination: {} } } },
  }));
  const apps = JSON.stringify({ apps: [] });
  await writeFile(join(dir, "seed/chatgpt-apps.json"), apps);
  await writeFile(join(dir, "seed/skills.json"), JSON.stringify({ skills: [] }));
  await writeFile(join(dir, "lib/data.ts"), 'const publicCacheVersion = "test";');
  await writeFile(join(dir, "bin/npm"), `#!${process.execPath}
const allowed = new Set(["discovery:index", "data:health", "seed"]);
process.exit(process.argv[2] === "run" && allowed.has(process.argv[3]) ? 0 : 99);
`, { mode: 0o755 });
  const result = spawnSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), resolve("scripts/sync-data.ts"), "--sources", "chatgpt",
  ], {
    cwd: dir,
    env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` },
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(await readFile(join(dir, "reports/data-sync.json"), "utf8"));
  assert.equal(report.sources.chatgpt.status, "failed");
  assert.equal(report.sources.chatgpt.lastSuccessAt, lastSuccessAt);
  assert.match(report.sources.chatgpt.message, /already synchronized/);
  assert.equal(await readFile(join(dir, "seed/chatgpt-apps.json"), "utf8"), apps);
});

test("partial captures cannot be replayed after refreshing another source", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-partial-sync-test-"));
  for (const path of ["seed", "reports", "lib", "bin"]) await mkdir(join(dir, path));
  const lastSuccessAt = new Date(Date.now() - 3_600_000).toISOString();
  const capturedAt = new Date(Date.now() - 60_000).toISOString();
  const reportPath = join(dir, "reports/data-sync.json");
  await writeFile(reportPath, JSON.stringify({
    sources: { chatgpt: { status: "ok", lastSuccessAt, message: "Prior real success" } },
  }));
  await writeFile(join(dir, "seed/raw-chatgpt-apps.json"), JSON.stringify({
    capturedAt,
    categories: {
      productivity: { status: 200, complete: true, data: { plugins: [], pagination: {} } },
      entertainment: { status: 0, complete: false, data: { plugins: [] } },
    },
  }));
  const apps = JSON.stringify({ apps: [] });
  await writeFile(join(dir, "seed/chatgpt-apps.json"), apps);
  await writeFile(join(dir, "seed/skills.json"), JSON.stringify({ skills: [] }));
  await writeFile(join(dir, "lib/data.ts"), 'const publicCacheVersion = "test";');
  const callsPath = join(dir, "imports.txt");
  await writeFile(join(dir, "bin/npm"), `#!${process.execPath}
const fs = require("node:fs");
const script = process.argv[3];
if (script === "scrape") fs.appendFileSync(${JSON.stringify(callsPath)}, "imported\\n");
const allowed = new Set(["scrape", "clients:import", "discovery:index", "data:health", "seed"]);
process.exit(process.argv[2] === "run" && allowed.has(script) ? 0 : 99);
`, { mode: 0o755 });
  const run = (source: string) => {
    const result = spawnSync(process.execPath, [
      "--import", import.meta.resolve("tsx"), resolve("scripts/sync-data.ts"), "--sources", source,
    ], { cwd: dir, env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` }, encoding: "utf8", timeout: 30_000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
  };
  run("chatgpt");
  let report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.sources.chatgpt.status, "partial");
  assert.equal(report.sources.chatgpt.lastSuccessAt, lastSuccessAt);
  assert.equal(report.sources.chatgpt.lastImportedCaptureAt, capturedAt);
  run("clients");
  report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.sources.chatgpt.lastImportedCaptureAt, capturedAt);
  run("chatgpt");
  report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.sources.chatgpt.status, "failed");
  assert.equal(report.sources.chatgpt.lastSuccessAt, lastSuccessAt);
  assert.equal(report.sources.chatgpt.lastImportedCaptureAt, capturedAt);
  assert.match(report.sources.chatgpt.message, /already synchronized/);
  assert.equal(await readFile(callsPath, "utf8"), "imported\n");
  assert.equal(await readFile(join(dir, "seed/chatgpt-apps.json"), "utf8"), apps);
});

test("source-only refresh migrates the last capture marker from legacy publication reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-legacy-sync-test-"));
  for (const path of ["seed", "reports", "lib", "bin"]) await mkdir(join(dir, path));
  const lastSuccessAt = new Date(Date.now() - 3_600_000).toISOString();
  const capturedAt = new Date(Date.now() - 60_000).toISOString();
  const reportPath = join(dir, "reports/data-sync.json");
  await writeFile(reportPath, JSON.stringify({
    sources: { chatgpt: { status: "partial", lastSuccessAt, message: "Prior partial import" } },
    publication: { chatgpt: { capturedAt } },
  }));
  await writeFile(join(dir, "seed/raw-chatgpt-apps.json"), JSON.stringify({
    capturedAt,
    categories: { productivity: { status: 200, complete: true, data: { plugins: [], pagination: {} } } },
  }));
  await writeFile(join(dir, "seed/chatgpt-apps.json"), JSON.stringify({ apps: [] }));
  await writeFile(join(dir, "seed/skills.json"), JSON.stringify({ skills: [] }));
  await writeFile(join(dir, "lib/data.ts"), 'const publicCacheVersion = "test";');
  await writeFile(join(dir, "bin/npm"), `#!${process.execPath}
const allowed = new Set(["clients:import", "discovery:index", "data:health", "seed"]);
process.exit(process.argv[2] === "run" && allowed.has(process.argv[3]) ? 0 : 99);
`, { mode: 0o755 });
  for (const source of ["clients", "chatgpt"]) {
    const result = spawnSync(process.execPath, [
      "--import", import.meta.resolve("tsx"), resolve("scripts/sync-data.ts"), "--sources", source,
    ], { cwd: dir, env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` }, encoding: "utf8", timeout: 30_000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.sources.chatgpt.lastImportedCaptureAt, capturedAt);
    assert.equal(report.sources.chatgpt.lastSuccessAt, lastSuccessAt);
    assert.equal(report.sources.chatgpt.status, source === "clients" ? "partial" : "failed");
    if (source === "chatgpt") assert.match(report.sources.chatgpt.message, /already synchronized/);
  }
});

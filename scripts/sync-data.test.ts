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

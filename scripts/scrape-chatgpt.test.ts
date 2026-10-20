import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("a browser summary preserves existing rich data and stable IDs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-import-test-"));
  const catalog = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
  const existing = structuredClone(catalog.apps.find((app: { id: string }) => app.id === "github"));
  existing.id = "stable-github-id";
  existing.description = "A detailed, previously verified description with maintenance and setup information.";
  existing.repoUrl = "https://github.com/example/verified";
  existing.mcpTransport = "stdio";
  existing.authType = "none";
  existing.installCmd = "npx verified-mcp-server";
  existing.tools = [{ name: "verified_tool" }];
  existing.previews = [{ sort: 0, prompt: "Existing example", imageKey: "previews/kept.webp" }];
  existing.publishedAt = 1234;
  const externalId = existing.surfaces.find((surface: { platform: string }) => surface.platform === "chatgpt").externalId;
  const untouched = structuredClone(catalog.apps.find((app: { id: string }) => app.id !== "github"));
  const input = join(dir, "capture.json");
  const output = join(dir, "catalog.json");
  const capture = { categories: { productivity: { status: 200, complete: true, data: {
    plugins: [
      { id: externalId, display_name: "GitHub renamed", short_description: "New summary", status: "ENABLED" },
      { id: "plugin_different", display_name: "stable-github-id", short_description: "Different plugin", status: "ENABLED" },
      { id: "plugin_protected", display_name: "Pending Submission", short_description: "Public plugin", status: "ENABLED" },
    ],
    pagination: { next_page_token: null as string | null },
  } } } };
  await writeFile(input, JSON.stringify(capture));
  await writeFile(output, JSON.stringify({ categories: catalog.categories, apps: [existing, untouched] }));
  const protectedPath = join(dir, "protected.json");
  await writeFile(protectedPath, JSON.stringify([{ results: [{ id: "pending-submission" }] }]));
  execFileSync(process.execPath, ["--import", "tsx", "scripts/scrape-chatgpt.ts", input, output, "--no-download-media", "--protected-apps", protectedPath], { stdio: "pipe" });
  const result = JSON.parse(await readFile(output, "utf8"));
  assert.equal(result.apps.length, 4);
  assert.equal(new Set(result.apps.map((app: { id: string }) => app.id)).size, 4);
  assert.equal(result.apps.some((app: { id: string }) => app.id === "pending-submission"), false);
  const merged = result.apps.find((app: { id: string }) => app.id === existing.id);
  assert.equal(merged.description, existing.description);
  assert.equal(merged.repoUrl, existing.repoUrl);
  assert.equal(merged.mcpTransport, existing.mcpTransport);
  assert.equal(merged.authType, existing.authType);
  assert.equal(merged.installCmd, existing.installCmd);
  assert.equal(merged.publishedAt, 1234);
  assert.deepEqual(merged.tools, existing.tools);
  assert.deepEqual(merged.previews, existing.previews);
  assert.deepEqual(result.apps.find((app: { id: string }) => app.id === untouched.id), untouched);

  capture.categories.productivity.data.pagination.next_page_token = "unfinished";
  await writeFile(input, JSON.stringify(capture));
  const before = await readFile(output, "utf8");
  assert.throws(() => execFileSync(process.execPath, ["--import", "tsx", "scripts/scrape-chatgpt.ts", input, output, "--no-download-media"], { stdio: "pipe" }));
  assert.equal(await readFile(output, "utf8"), before);
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { extractPublicDirectoryItems } from "./claude-public-directory";
import { publicServerUrl } from "./public-server-url";

test("public endpoints never include embedded credentials or API keys", () => {
  assert.equal(publicServerUrl("https://example.com/mcp"), "https://example.com/mcp");
  assert.equal(publicServerUrl("https://example.com/mcp?api_key=private"), undefined);
  assert.equal(publicServerUrl("https://example.com/mcp?access_token=private"), undefined);
  assert.equal(publicServerUrl("https://user:private@example.com/mcp"), undefined);
  assert.equal(publicServerUrl(`https://example.com/mcp?tracker=${"zpk" + "a".repeat(43)}`), undefined);
  assert.equal(publicServerUrl("javascript:alert(1)"), undefined);
});

function page(items: unknown[], count = items.length) {
  const record = `a:${JSON.stringify(["$", "component", null, { data: { items } }])}\n`;
  const split = Math.floor(record.length / 2);
  return `<main>All connectors <span>${count}</span> connectors</main>` + [record.slice(0, split), record.slice(split)]
    .map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`).join("");
}

test("Claude structured data includes entries beyond the rendered first page", () => {
  const items = Array.from({ length: 987 }, (_, i) => ({
    title: `Connector ${i}`, slug: `connector-${i}`, type: "remote",
    directoryUrl: `https://claude.ai/directory/${i}`, categories: null,
  }));
  const parsed = extractPublicDirectoryItems(page(items));
  assert.equal(parsed?.length, 987);
  assert.equal(parsed?.at(-1)?.slug, "connector-986");
  assert.throws(() => extractPublicDirectoryItems(page(items.slice(0, 35), 987)), /coverage mismatch/);
  assert.throws(() => extractPublicDirectoryItems(page([items[0], items[0]])), /Duplicate/);
  assert.throws(() => extractPublicDirectoryItems(page([{ ...items[0], directoryUrl: "https://example.com/private" }])));
  assert.equal(extractPublicDirectoryItems("<html>Legacy directory</html>"), undefined);
});

test("Claude merge preserves rich metadata and protected submissions, deferring unverified local extensions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-claude-test-"));
  const catalog = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
  const existing = structuredClone(catalog.apps.find((app: { id: string }) => app.id === "github"));
  existing.id = "stable-id";
  existing.description = "An existing detailed description that must never be replaced by a summary.";
  existing.publishedAt = 123;
  existing.surfaces = existing.surfaces.filter((surface: { platform: string }) => surface.platform === "chatgpt");
  const untouched = structuredClone(catalog.apps.find((app: { id: string }) => app.id === "canva"));
  const output = join(dir, "catalog.json");
  const raw = join(dir, "raw.json");
  const protectedPath = join(dir, "protected.json");
  await writeFile(output, JSON.stringify({ ...catalog, apps: [existing, untouched] }));
  await writeFile(protectedPath, JSON.stringify([{ results: [{ id: "pending-app" }] }]));
  const connector = { page: 1, name: "GitHub", slug: "github", href: "https://claude.com/marketplace/connectors/github",
    tagline: "A short summary", categories: [], worksWith: ["claude-code"], date: "2026-01-02T00:00:00.000Z",
    serverUrl: "https://example.com/mcp", detail: { capabilities: [], directoryLinks: [{ id: "github-id", href: "https://claude.ai/directory/github-id" }] } };
  await writeFile(raw, JSON.stringify({ connectors: [connector,
    { ...connector, name: "Pending App", slug: "pending-app",
      detail: { capabilities: [], directoryLinks: [{ id: "new-id", href: "https://claude.ai/directory/new-id" }] } },
    { ...connector, name: "Local Extension", slug: "local-extension", local: true, serverUrl: undefined },
  ] }));
  execFileSync(process.execPath, ["--import", "tsx", "scripts/scrape-claude-connectors.ts", output, raw, "--cache-only"], {
    stdio: "pipe", env: { ...process.env, PROTECTED_APPS_PATH: protectedPath },
  });
  const result = JSON.parse(await readFile(output, "utf8"));
  assert.equal(new Set(result.apps.map((app: { id: string }) => app.id)).size, 3);
  const merged = result.apps.find((app: { id: string }) => app.id === "stable-id");
  assert.equal(merged.description, existing.description);
  assert.equal(merged.publishedAt, 123);
  assert.deepEqual(merged.previews, existing.previews);
  assert.deepEqual(merged.surfaces[0], existing.surfaces[0]);
  assert.equal(merged.surfaces.at(-1).mcpEndpoint, connector.serverUrl);
  assert.deepEqual(result.apps.find((app: { id: string }) => app.id === "canva"), untouched);
  const added = result.apps.find((app: { id: string }) => app.id === "pending-app-claude");
  assert.equal(added.publishedAt, Date.parse(connector.date));
  assert.equal(added.mcpTransport, "http");
  assert.equal(result.apps.some((app: { id: string }) => app.id === "local-extension"), false);
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("clients use fresh GitHub API content when raw delivery fails, preserving existing entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcpapp-clients-test-"));
  const output = join(dir, "clients.json");
  const previous = { id: "kept", name: "Kept", summary: "Verified details" };
  await writeFile(output, JSON.stringify({ generatedAt: "old", clients: [previous] }));
  const code = `
    import assert from 'node:assert/strict';
    process.argv = ['node', 'import', '--output', ${JSON.stringify(output)}];
    const urls = [];
    globalThis.fetch = async (url, options) => {
      urls.push(url);
      if (urls.length === 1) throw new Error('Raw connection timeout');
      assert.equal(url, 'https://api.github.com/repos/punkpeye/awesome-mcp-clients/contents/README.md?ref=main');
      assert.equal(options.headers.accept, 'application/vnd.github.raw+json');
      return { ok: true, text: async () => '### Fresh Client\\n\\nA freshly fetched public MCP client.' };
    };
    await import('./scripts/import-mcp-clients.ts');
    assert.equal(urls.length, 2);
  `;
  execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", code], { stdio: "pipe" });
  const result = JSON.parse(await readFile(output, "utf8"));
  assert.deepEqual(result.clients.find((client: { id: string }) => client.id === "kept"), previous);
  assert.equal(result.clients.find((client: { id: string }) => client.id === "fresh-client").name, "Fresh Client");
  assert.notEqual(result.generatedAt, "old");
});

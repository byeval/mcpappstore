import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

async function capture(repeat = false) {
  const requests: URL[] = [];
  let download: Blob | undefined;
  class DownloadURL extends URL {
    static createObjectURL(blob: Blob) {
      download = blob;
      return "blob:public-capture";
    }
  }
  const source = await readFile("scripts/capture-chatgpt-plugins.js", "utf8");
  await runInNewContext(source, {
    URL: DownloadURL, Blob, AbortSignal, console: { log() {} },
    location: { origin: "https://chatgpt.com", href: "https://chatgpt.com/plugins" },
    document: {
      querySelectorAll: () => [{ href: "https://chatgpt.com/plugins?category=productivity" }],
      createElement: () => ({ click() {} }),
    },
    fetch: async (url: URL) => {
      requests.push(url);
      assert.equal(url.searchParams.get("scope"), "GLOBAL");
      assert.equal(url.searchParams.has("page_token"), false);
      const secondPage = url.searchParams.get("pageToken") === "next-public-page";
      return { ok: true, json: async () => ({
        plugins: [{ id: secondPage && !repeat ? "second" : "first" }],
        pagination: { next_page_token: secondPage && !repeat ? null : "next-public-page" },
      }) };
    },
  });
  assert.ok(download);
  return { requests, data: JSON.parse(await download.text()) };
}

test("ChatGPT capture uses pageToken and includes every public page", async () => {
  const { requests, data } = await capture();
  assert.equal(requests.length, 2);
  const category = data.categories.productivity;
  assert.equal(category.complete, true);
  assert.equal(category.pages, 2);
  assert.deepEqual(category.data.plugins.map((plugin: { id: string }) => plugin.id), ["first", "second"]);
});

test("ChatGPT repeated pagination remains incomplete", async () => {
  const { requests, data } = await capture(true);
  assert.equal(requests.length, 2);
  assert.equal(data.categories.productivity.complete, false);
  assert.match(data.categories.productivity.error, /Pagination did not advance/);
});

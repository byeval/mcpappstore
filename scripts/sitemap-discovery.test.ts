import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogSitemapIndexEntries, localizedSitemapChunkCount, sitemapIndexDocument } from "../lib/sitemap";
import { supportedLocales } from "../lib/i18n";

test("catalog growth keeps every localized source entry discoverable across the 50,000 URL boundary", () => {
  const perShard = Math.floor(50_000 / supportedLocales.length);
  assert.equal(localizedSitemapChunkCount(perShard), 1);
  assert.equal(localizedSitemapChunkCount(perShard + 1), 2);
  const entries = Array.from({ length: perShard * 2 + 1 }, (_, index) => ({ updatedAt: Date.UTC(2026, 0, 1) + index * 1000 }));
  const maps = catalogSitemapIndexEntries("apps", entries);
  assert.deepEqual(maps.map(item => new URL(item.url).pathname), ["/sitemaps/apps-0.xml", "/sitemaps/apps-1.xml", "/sitemaps/apps-2.xml"]);
  assert.equal(new Date(maps[2].lastModified!).getTime(), entries.at(-1)!.updatedAt);
  assert.equal((sitemapIndexDocument(maps).match(/<sitemap>/g) ?? []).length, 3);
});

test("small catalog retains stable URL; skills do not invent modification dates", () => {
  const maps = catalogSitemapIndexEntries("skills", [{ updatedAt: 123 }]);
  assert.equal(new URL(maps[0].url).pathname, "/sitemaps/skills.xml");
  assert.equal(maps[0].lastModified, undefined);
  assert.ok(!sitemapIndexDocument(maps).includes("<lastmod>"));
  assert.ok(sitemapIndexDocument([{ url: "https://mcpapp.net/a?x=1&y=2" }]).includes("&amp;"));
});

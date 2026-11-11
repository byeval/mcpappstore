import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  canonicalAppId,
  entitySignature,
  reviewedCanonicalAliases,
} from "../lib/catalog-identity";
import { appEditorial } from "../lib/app-editorial";
import {
  localizedGetLearnArticle,
  localizedLearnArticles,
} from "../lib/content-i18n";
import { paginationWindow } from "../lib/pagination";
import { listCollectionApps, getAppCollection } from "../lib/collections";
import type { SeedCatalog } from "../lib/types";
const apps = (
  JSON.parse(readFileSync("seed/chatgpt-apps.json", "utf8")) as SeedCatalog
).apps;
const app = (id: string) => {
  const a = apps.find((a) => a.id === id);
  assert.ok(a);
  return a;
};
test("canonical aliases require external identity, never display-name equality", () => {
  for (const [id, { target }] of Object.entries(reviewedCanonicalAliases)) {
    assert.equal(entitySignature(app(id)), entitySignature(app(target)));
    assert.equal(canonicalAppId(app(id)), target);
    assert.equal(
      canonicalAppId({
        ...app(id),
        surfaces: [{ ...app(id).surfaces[0], externalId: "different" }],
      }),
      id,
    );
  }
  assert.notEqual(
    entitySignature(app("tableau")),
    entitySignature(app("tableau-mcp-only-eol-soon")),
  );
  assert.equal(
    canonicalAppId(app("tableau-mcp-only-eol-soon")),
    "tableau-mcp-only-eol-soon",
  );
});
test("untranslated guides retain original instructions and code rather than generic filler", () => {
  const original = localizedGetLearnArticle("build-your-first-mcp-app", "en")!;
  const fallback = localizedGetLearnArticle("build-your-first-mcp-app", "es")!;
  assert.equal(fallback.translationStatus, "original");
  assert.equal(fallback.contentLanguage, "en");
  assert.deepEqual(fallback.sections, original.sections);
  for (const locale of [
    "en",
    "es",
    "fr",
    "de",
    "ru",
    "zh-hans",
    "ja",
    "ko",
  ] as const) {
    for (const a of localizedLearnArticles(locale))
      assert.notEqual(
        a.sections
          .slice(0, 2)
          .map((s) => s.id)
          .join(","),
        "overview,evaluation",
      );
  }
  for (const slug of [
    "what-is-an-mcp-app",
    "build-your-first-mcp-app",
    "claude-connectors-for-databases",
  ]) {
    const a = localizedGetLearnArticle(slug, "zh-hans")!;
    assert.equal(a.translationStatus, "complete");
    assert.ok(a.sections.length >= 4);
    assert.ok(a.sources.length >= 2);
  }
});
test("editorial evidence is documentation only and has both English and Chinese content", () => {
  assert.equal(Object.keys(appEditorial).length, 20);
  for (const [id, e] of Object.entries(appEditorial)) {
    app(id);
    assert.equal(e.scope, "documentation");
    assert.equal(new URL(e.sourceUrl).protocol, "https:");
    assert.ok(e.en.check && e.zh.check && e.en.prompt && e.zh.prompt);
  }
});
test("collections retain all matches while giving explicit selections a stable place", () => {
  const c = getAppCollection("chatgpt-apps-for-design")!;
  const result = listCollectionApps(c, [app("figma"), app("canva")]);
  assert.deepEqual(
    result.map((a) => a.id),
    ["canva", "figma"],
  );
});
test("pagination stays bounded while preserving first, last and adjacent pages", () => {
  assert.deepEqual(paginationWindow(1, 364), [1, 2, null, 364]);
  assert.deepEqual(paginationWindow(182, 364), [
    1,
    null,
    181,
    182,
    183,
    null,
    364,
  ]);
  assert.deepEqual(paginationWindow(1, 1), [1]);
});

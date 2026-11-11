import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { indexNowKey, indexNowKeyPath } from "../lib/indexnow";
import { getMessages, localizedPath, supportedLocales } from "../lib/i18n";
import {
  localizedAppDescription,
  localizedAppSeoTitle,
  siteNameForLocale,
} from "../lib/seo";
import {
  localizedLearnArticles,
  localizedAppCollections,
} from "../lib/content-i18n";
import {
  canonicalAppId,
  entitySignature,
  reviewedCanonicalAliases,
} from "../lib/catalog-identity";
import { appEditorial } from "../lib/app-editorial";
import type { SeedCatalog } from "../lib/types";
interface Page {
  url: string;
  title: string;
  description: string;
  id?: string;
}
const catalog = JSON.parse(
  await readFile(resolve("seed/chatgpt-apps.json"), "utf8"),
) as SeedCatalog;
const apps = catalog.apps.filter((a) => a.status === "published");
const byId = new Map(apps.map((a) => [a.id, a]));
const pages: Page[] = [];
const errors: string[] = [];
const localization = [];
for (const locale of supportedLocales) {
  const t = getMessages(locale);
  pages.push({
    url: localizedPath("/", locale),
    title: t.home.metaTitle,
    description: t.home.metaDescription,
  });
  for (const app of apps)
    if (canonicalAppId(app) === app.id)
      pages.push({
        url: localizedPath(`/app/${app.id}`, locale),
        id: app.id,
        title: `${localizedAppSeoTitle(app, locale)} | ${siteNameForLocale(locale)}`,
        description: localizedAppDescription(app, locale),
      });
  const articles = localizedLearnArticles(locale);
  for (const a of articles) {
    pages.push({
      url: localizedPath(`/learn/${a.slug}`, locale),
      title: a.title,
      description: a.description,
    });
    if (a.sections[0]?.id === "overview" && a.sections[1]?.id === "evaluation")
      errors.push(`Generic article body: ${locale}/${a.slug}`);
    if (a.sections.length === 0 || a.sources.length === 0)
      errors.push(`Missing article content or sources: ${locale}/${a.slug}`);
  }
  localization.push({
    locale,
    articles: articles.length,
    fullTranslations: articles.filter((a) => a.translationStatus !== "original")
      .length,
    originalBodyFallback: articles
      .filter((a) => a.translationStatus === "original")
      .map((a) => a.slug),
  });
  for (const c of localizedAppCollections(locale))
    pages.push({
      url: localizedPath(`/collections/${c.slug}`, locale),
      title: c.title,
      description: c.description,
    });
}
function duplicates(field: "title" | "description") {
  const groups = new Map<string, Page[]>();
  for (const p of pages)
    groups.set(p[field], [...(groups.get(p[field]) ?? []), p]);
  return [...groups]
    .filter(([, p]) => p.length > 1)
    .map(([value, p]) => {
      const entities = p.map((x) => (x.id ? byId.get(x.id) : undefined));
      const signatures = entities.map((x) => (x ? entitySignature(x) : null));
      return {
        value,
        classification: signatures.every((s) => s && s === signatures[0])
          ? "same-external-identity-review-canonical"
          : "needs-identity-review",
        pages: p.map((x) => ({
          url: x.url,
          id: x.id,
          signature: x.id ? entitySignature(byId.get(x.id)!) : null,
        })),
      };
    });
}
for (const page of pages)
  if (!page.title.trim() || !page.description.trim())
    errors.push(`Empty metadata: ${page.url}`);
for (const [alias, entry] of Object.entries(reviewedCanonicalAliases)) {
  const from = byId.get(alias),
    to = byId.get(entry.target);
  if (
    !from ||
    !to ||
    !entitySignature(from) ||
    entitySignature(from) !== entitySignature(to)
  )
    errors.push(`Canonical alias identity changed: ${alias}`);
}
for (const [id, e] of Object.entries(appEditorial))
  if (
    !byId.has(id) ||
    e.scope !== "documentation" ||
    !e.sourceUrl.startsWith("https://")
  )
    errors.push(`Invalid editorial evidence: ${id}`);
if (
  (await readFile(resolve(`public${indexNowKeyPath}`), "utf8")).trim() !==
  indexNowKey
)
  errors.push("IndexNow key mismatch");
const titleDuplicates = duplicates("title"),
  descriptionDuplicates = duplicates("description");
const report = {
  generatedAt: new Date().toISOString(),
  catalogApps: apps.length,
  pages: pages.length,
  scope:
    "Seed home, canonical app metadata, guides and collections in all locales; HTTP/indexing checked separately",
  errors,
  summary: {
    duplicateTitles: titleDuplicates.length,
    duplicateDescriptions: descriptionDuplicates.length,
    longTitles: pages.filter((p) => p.title.length > 68).length,
    longDescriptions: pages.filter((p) => p.description.length > 160).length,
    editorialApps: Object.keys(appEditorial).length,
  },
  localization,
  titleDuplicates,
  descriptionDuplicates,
};
const out = process.argv.find((a) => a.startsWith("--output="))?.slice(9);
if (out) {
  await mkdir(resolve(out, ".."), { recursive: true });
  await writeFile(out, JSON.stringify(report, null, 2) + "\n");
}
console.log(
  JSON.stringify(
    {
      catalogApps: report.catalogApps,
      pages: report.pages,
      errors,
      summary: report.summary,
      localization: localization.map(({ originalBodyFallback, ...row }) => ({
        ...row,
        originalBodyFallback: originalBodyFallback.length,
      })),
    },
    null,
    2,
  ),
);
console.log(
  "Duplicate identities and snippet lengths are editorial review warnings, not proof of indexing failure. Use --output=PATH for every affected URL.",
);
if (
  errors.length ||
  (process.argv.includes("--strict") &&
    (titleDuplicates.length || descriptionDuplicates.length))
)
  process.exitCode = 1;

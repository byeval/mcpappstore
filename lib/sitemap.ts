import { activeAppIndexKeys, appIndexPath } from "@/lib/app-index";
import { appCollections } from "@/lib/collections";
import {
  CATEGORY_APP_PAGE_SIZE,
  PLATFORM_APP_PAGE_SIZE,
  countAppsByPlatform,
  getCategorySummaries,
  latestPlatformAppTimestamp,
  listSitemapAppEntries,
  listSitemapSkillEntries,
} from "@/lib/data";
import { learnArticles } from "@/lib/learn";
import { paginatedPath } from "@/lib/pagination";
import { isIndexableCategory } from "@/lib/seo-indexing";
import { absoluteUrl } from "@/lib/utils";
import { localizedPath, supportedLocales } from "@/lib/i18n";
import { skillPath } from "@/lib/skill-routes";

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export interface SitemapEntry {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: ChangeFrequency;
  priority?: number;
}

const maxSitemapUrls = 50_000;
const localizedSourceEntriesPerSitemap = Math.max(1, Math.floor(maxSitemapUrls / supportedLocales.length));

const baseSitemapPaths = [
  "/sitemaps/static.xml",
  "/sitemaps/categories.xml",
  "/sitemaps/collections.xml",
  "/sitemaps/learn.xml",
];

function dateFromTimestamp(timestamp: number): Date {
  return new Date(timestamp || Date.now());
}

function maxUpdatedAt(entries: Array<{ updatedAt: number }>): number {
  return entries.reduce((max, entry) => Math.max(max, entry.updatedAt), 0);
}

export function localizedSitemapChunkCount(sourceEntryCount: number): number {
  return Math.max(1, Math.ceil((sourceEntryCount * supportedLocales.length) / maxSitemapUrls));
}

function chunkedSitemapPaths(kind: "apps" | "skills", sourceEntryCount: number): string[] {
  const chunkCount = localizedSitemapChunkCount(sourceEntryCount);
  if (chunkCount <= 1) {
    return [`/sitemaps/${kind}.xml`];
  }

  return Array.from({ length: chunkCount }, (_, index) => `/sitemaps/${kind}-${index}.xml`);
}

function sitemapSourceChunk<T>(entries: T[], chunk: number | undefined): T[] {
  const chunkCount = localizedSitemapChunkCount(entries.length);
  if (chunk === undefined) {
    return chunkCount > 1 ? entries.slice(0, localizedSourceEntriesPerSitemap) : entries;
  }

  if (chunk < 0 || chunk >= chunkCount) {
    return [];
  }

  const start = chunk * localizedSourceEntriesPerSitemap;
  return entries.slice(start, start + localizedSourceEntriesPerSitemap);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function paginatedEntries({
  basePath,
  totalCount,
  pageSize,
  changeFrequency,
  priority,
  lastModified,
}: {
  basePath: string;
  totalCount: number;
  pageSize: number;
  changeFrequency: ChangeFrequency;
  priority: number;
  lastModified?: Date | string;
}): SitemapEntry[] {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) {
    return [];
  }

  return Array.from({ length: totalPages - 1 }, (_, index) => ({
    url: absoluteUrl(paginatedPath(basePath, index + 2)),
    lastModified,
    changeFrequency,
    priority,
  }));
}

function localizedEntries(path: string, entry: Omit<SitemapEntry, "url">): SitemapEntry[] {
  return supportedLocales.map((locale) => ({
    ...entry,
    url: absoluteUrl(localizedPath(path, locale)),
  }));
}

function localizedPaginatedEntries({
  basePath,
  totalCount,
  pageSize,
  changeFrequency,
  priority,
  lastModified,
}: {
  basePath: string;
  totalCount: number;
  pageSize: number;
  changeFrequency: ChangeFrequency;
  priority: number;
  lastModified?: Date | string;
}): SitemapEntry[] {
  return paginatedEntries({ basePath, totalCount, pageSize, changeFrequency, priority, lastModified }).flatMap((entry) => {
    const pathname = new URL(entry.url).pathname + new URL(entry.url).search;
    return localizedEntries(pathname, {
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    });
  });
}

export function sitemapXmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

export async function sitemapIndexXml(): Promise<string> {
  const [apps, skills] = await Promise.all([listSitemapAppEntries(), listSitemapSkillEntries()]);
  const sitemapPaths = [
    ...baseSitemapPaths.slice(0, 1),
    ...chunkedSitemapPaths("apps", apps.length),
    ...chunkedSitemapPaths("skills", skills.length),
    ...baseSitemapPaths.slice(1),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((path) => `  <sitemap><loc>${escapeXml(absoluteUrl(path))}</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
}

export function urlsetXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const parts = ["  <url>", `    <loc>${escapeXml(entry.url)}</loc>`];
    if (entry.lastModified) {
      parts.push(`    <lastmod>${xmlDate(entry.lastModified)}</lastmod>`);
    }
    if (entry.changeFrequency) {
      parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
    }
    if (entry.priority !== undefined) {
      parts.push(`    <priority>${entry.priority}</priority>`);
    }
    parts.push("  </url>");
    return parts.join("\n");
  })
  .join("\n")}
</urlset>
`;
}

export async function buildStaticSitemapEntries(): Promise<SitemapEntry[]> {
  const [apps, skills, chatGptCount, claudeCount, chatGptLatest, claudeLatest] = await Promise.all([
    listSitemapAppEntries(),
    listSitemapSkillEntries(),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
    latestPlatformAppTimestamp("chatgpt"),
    latestPlatformAppTimestamp("claude"),
  ]);
  const appIndexPages = activeAppIndexKeys(apps);
  const catalogLastModified = dateFromTimestamp(maxUpdatedAt(apps));
  const skillsLastModified = dateFromTimestamp(maxUpdatedAt(skills));
  const staticLastModified = dateFromTimestamp(
    Math.max(
      maxUpdatedAt(apps),
      maxUpdatedAt(skills),
      ...appCollections.map((collection) => new Date(collection.updatedAt).getTime()),
      ...learnArticles.map((article) => new Date(article.updatedAt).getTime()),
    ),
  );
  const chatGptLastModified = dateFromTimestamp(chatGptLatest || maxUpdatedAt(apps));
  const claudeLastModified = dateFromTimestamp(claudeLatest || maxUpdatedAt(apps));

  return [
    ...localizedEntries("/", { lastModified: catalogLastModified, changeFrequency: "daily", priority: 1 }),
    ...localizedEntries("/mcp-directory", { lastModified: catalogLastModified, changeFrequency: "daily", priority: 0.92 }),
    ...localizedEntries("/store", { lastModified: catalogLastModified, changeFrequency: "daily", priority: 0.9 }),
    ...localizedEntries("/skills", { lastModified: skillsLastModified, changeFrequency: "daily", priority: 0.82 }),
    ...appIndexPages.flatMap((key) => localizedEntries(appIndexPath(key), {
      lastModified: catalogLastModified,
      changeFrequency: "daily" as const,
      priority: 0.82,
    })),
    ...localizedEntries("/chatgpt-apps", { lastModified: chatGptLastModified, changeFrequency: "daily", priority: 0.9 }),
    ...localizedEntries("/chatgpt-connectors", { lastModified: chatGptLastModified, changeFrequency: "daily", priority: 0.82 }),
    ...localizedPaginatedEntries({
      basePath: "/chatgpt-apps",
      totalCount: chatGptCount,
      pageSize: PLATFORM_APP_PAGE_SIZE,
      lastModified: chatGptLastModified,
      changeFrequency: "daily",
      priority: 0.74,
    }),
    ...localizedEntries("/claude-connectors", { lastModified: claudeLastModified, changeFrequency: "daily", priority: 0.9 }),
    ...localizedPaginatedEntries({
      basePath: "/claude-connectors",
      totalCount: claudeCount,
      pageSize: PLATFORM_APP_PAGE_SIZE,
      lastModified: claudeLastModified,
      changeFrequency: "daily",
      priority: 0.74,
    }),
    ...localizedEntries("/docs", { lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.55 }),
    ...localizedEntries("/faq", { lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.55 }),
    ...localizedEntries("/submit", { lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.45 }),
    ...localizedEntries("/terms", { lastModified: staticLastModified, changeFrequency: "yearly", priority: 0.2 }),
    ...localizedEntries("/privacy", { lastModified: staticLastModified, changeFrequency: "yearly", priority: 0.2 }),
  ];
}

export async function buildAppsSitemapEntries(options: { chunk?: number } = {}): Promise<SitemapEntry[]> {
  const apps = await listSitemapAppEntries();
  return sitemapSourceChunk(apps, options.chunk).flatMap((app) => localizedEntries(`/app/${app.id}`, {
    lastModified: new Date(app.updatedAt),
    changeFrequency: "weekly",
    priority: 0.64,
  }));
}

export async function buildSkillsSitemapEntries(options: { chunk?: number } = {}): Promise<SitemapEntry[]> {
  const skills = await listSitemapSkillEntries();
  return sitemapSourceChunk(skills, options.chunk).flatMap((skill) => localizedEntries(skillPath(skill.id), {
    lastModified: new Date(skill.updatedAt),
    changeFrequency: "weekly",
    priority: 0.54,
  }));
}

export async function buildCategoriesSitemapEntries(): Promise<SitemapEntry[]> {
  const categories = await getCategorySummaries();
  return categories.filter(isIndexableCategory).flatMap((category) => [
    ...localizedEntries(`/category/${category.slug}`, {
      lastModified: category.latestUpdatedAt ? new Date(category.latestUpdatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: category.count >= 10 ? 0.72 : 0.62,
    }),
    ...localizedPaginatedEntries({
      basePath: `/category/${category.slug}`,
      totalCount: category.count,
      pageSize: CATEGORY_APP_PAGE_SIZE,
      lastModified: category.latestUpdatedAt ? new Date(category.latestUpdatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.54,
    }),
  ]);
}

export function buildCollectionsSitemapEntries(): SitemapEntry[] {
  const lastModified = new Date(Math.max(...appCollections.map((collection) => new Date(collection.updatedAt).getTime())));

  return [
    ...localizedEntries("/collections", { lastModified, changeFrequency: "weekly", priority: 0.84 }),
    ...appCollections.flatMap((collection) => localizedEntries(`/collections/${collection.slug}`, {
      lastModified: new Date(collection.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.76,
    })),
  ];
}

export function buildLearnSitemapEntries(): SitemapEntry[] {
  const lastModified = new Date(Math.max(...learnArticles.map((article) => new Date(article.updatedAt).getTime())));

  return [
    ...localizedEntries("/learn", { lastModified, changeFrequency: "weekly", priority: 0.84 }),
    ...learnArticles.flatMap((article) => localizedEntries(`/learn/${article.slug}`, {
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.78,
    })),
  ];
}

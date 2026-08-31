import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { indexNowHost, indexNowKey, indexNowKeyLocation } from "../lib/indexnow";
import { localizedPath, supportedLocales } from "../lib/i18n";
import { skillPath } from "../lib/skill-routes";
import type { CatalogApp, CatalogSkill, SeedCatalog, SeedSkillRegistry } from "../lib/types";

const endpoint = "https://api.indexnow.org/indexnow";
const siteOrigin = `https://${indexNowHost}`;
const timeoutMs = 20_000;
const maxUrlsPerRequest = 10_000;

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as T;
}

function stableRecord(value: unknown): string {
  return JSON.stringify(value, (key, item) => {
    if (key === "createdAt" || key === "updatedAt" || key === "publishedAt") {
      return undefined;
    }
    return item;
  });
}

function localizedUrls(path: string): string[] {
  return supportedLocales.map((locale) => `${siteOrigin}${localizedPath(path, locale)}`);
}

function changedRecordIds<T extends { id: string }>(before: T[], after: T[]): Set<string> {
  const beforeById = new Map(before.map((record) => [record.id, stableRecord(record)]));
  const afterById = new Map(after.map((record) => [record.id, stableRecord(record)]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  return new Set([...ids].filter((id) => beforeById.get(id) !== afterById.get(id)));
}

function publishedAppIds(apps: CatalogApp[]): Set<string> {
  return new Set(apps.filter((app) => app.status === "published").map((app) => app.id));
}

function appUrls(ids: Iterable<string>): string[] {
  return [...ids].flatMap((id) => localizedUrls(`/app/${id}`));
}

function skillUrls(ids: Iterable<string>): string[] {
  return [...ids].flatMap((id) => localizedUrls(skillPath(id)));
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function xmlLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]!.replaceAll("&amp;", "&"));
}

async function urlsFromSitemaps(): Promise<string[]> {
  const indexLocations = xmlLocations(await fetchText(`${siteOrigin}/sitemap.xml`));
  const sitemapLocations = indexLocations.filter((url) => new URL(url).pathname.endsWith(".xml"));
  const directUrls = indexLocations.filter((url) => !new URL(url).pathname.endsWith(".xml"));
  const childUrls = await Promise.all(sitemapLocations.map(async (url) => xmlLocations(await fetchText(url))));
  return [...directUrls, ...childUrls.flat()];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function submitBatch(urlList: string[], batchNumber: number): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: indexNowHost,
          key: indexNowKey,
          keyLocation: indexNowKeyLocation,
          urlList,
        }),
        signal: controller.signal,
      });
      if (response.ok) {
        console.log(`IndexNow accepted batch ${batchNumber} (${urlList.length} URLs, HTTP ${response.status}).`);
        return;
      }

      if (response.status !== 429 && response.status < 500) {
        throw new Error(`IndexNow rejected batch ${batchNumber}: HTTP ${response.status} ${await response.text()}`);
      }

      if (attempt === 3) {
        throw new Error(`IndexNow failed batch ${batchNumber} after ${attempt} attempts: HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("IndexNow rejected")) {
        throw error;
      }
      if (attempt === 3) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await delay(1_000 * 2 ** (attempt - 1));
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const submitSitemap = process.argv.includes("--sitemap");
  const submitAll = process.argv.includes("--all");
  const beforeCatalogPath = argValue("--before");
  const beforeSkillsPath = argValue("--before-skills");
  const catalog = await readJson<SeedCatalog>("seed/chatgpt-apps.json");
  const skills = await readJson<SeedSkillRegistry>("seed/skills.json");
  let urls: string[];

  if (submitSitemap) {
    urls = await urlsFromSitemaps();
  } else if (submitAll) {
    urls = [
      ...appUrls(publishedAppIds(catalog.apps)),
      ...skillUrls(skills.skills.filter((skill) => skill.status === "available").map((skill) => skill.id)),
      ...localizedUrls("/"),
      ...localizedUrls("/store"),
      ...localizedUrls("/skills"),
      `${siteOrigin}/sitemap.xml`,
    ];
  } else if (beforeCatalogPath || beforeSkillsPath) {
    urls = [];
    if (beforeCatalogPath) {
      const before = await readJson<SeedCatalog>(beforeCatalogPath);
      const publicIds = new Set([...publishedAppIds(before.apps), ...publishedAppIds(catalog.apps)]);
      const changedIds = [...changedRecordIds(before.apps, catalog.apps)].filter((id) => publicIds.has(id));
      urls.push(...appUrls(changedIds));
      if (changedIds.length > 0) {
        urls.push(...localizedUrls("/"), ...localizedUrls("/store"), `${siteOrigin}/sitemap.xml`);
      }
    }
    if (beforeSkillsPath) {
      const before = await readJson<SeedSkillRegistry>(beforeSkillsPath);
      const publicIds = new Set([
        ...before.skills.filter((skill) => skill.status === "available").map((skill) => skill.id),
        ...skills.skills.filter((skill) => skill.status === "available").map((skill) => skill.id),
      ]);
      const changedIds = [...changedRecordIds<CatalogSkill>(before.skills, skills.skills)].filter((id) => publicIds.has(id));
      urls.push(...skillUrls(changedIds));
      if (changedIds.length > 0) {
        urls.push(...localizedUrls("/skills"), `${siteOrigin}/sitemap.xml`);
      }
    }
  } else {
    throw new Error("Choose --sitemap, --all, or provide --before and/or --before-skills.");
  }

  const uniqueUrls = [...new Set(urls)].sort();
  if (uniqueUrls.length === 0) {
    console.log("IndexNow: no changed public URLs to submit.");
    return;
  }

  console.log(`IndexNow prepared ${uniqueUrls.length} unique URLs.`);
  if (dryRun) {
    console.log(uniqueUrls.slice(0, 10).join("\n"));
    return;
  }

  for (let offset = 0; offset < uniqueUrls.length; offset += maxUrlsPerRequest) {
    await submitBatch(uniqueUrls.slice(offset, offset + maxUrlsPerRequest), offset / maxUrlsPerRequest + 1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

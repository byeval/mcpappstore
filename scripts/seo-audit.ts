import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { indexNowKey, indexNowKeyPath } from "../lib/indexnow";
import { getMessages, localizedPath, supportedLocales } from "../lib/i18n";
import {
  localizedAppDescription,
  localizedAppSeoTitle,
  siteNameForLocale,
} from "../lib/seo";
import type { Locale } from "../lib/i18n";
import type { SeedCatalog } from "../lib/types";

interface AuditPage {
  url: string;
  title: string;
  description: string;
}

function duplicates(pages: AuditPage[], field: "title" | "description"): string[] {
  const urlsByValue = new Map<string, string[]>();
  for (const page of pages) {
    const urls = urlsByValue.get(page[field]) ?? [];
    urls.push(page.url);
    urlsByValue.set(page[field], urls);
  }
  return [...urlsByValue.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => `${field} duplicate on ${urls.length} URLs: ${value}`);
}

function auditedPage(path: string, locale: Locale, title: string, description: string): AuditPage {
  return {
    url: localizedPath(path, locale),
    title: `${title} | ${siteNameForLocale(locale)}`,
    description,
  };
}

async function main() {
  const catalog = JSON.parse(
    await readFile(resolve(process.cwd(), "seed/chatgpt-apps.json"), "utf8"),
  ) as SeedCatalog;
  const apps = catalog.apps.filter((app) => app.status === "published");
  const pages: AuditPage[] = [];

  for (const locale of supportedLocales) {
    const messages = getMessages(locale);
    pages.push(auditedPage("/", locale, messages.home.metaTitle, messages.home.metaDescription));
    for (const app of apps) {
      pages.push(auditedPage(
        `/app/${app.id}`,
        locale,
        localizedAppSeoTitle(app, locale),
        localizedAppDescription(app, locale),
      ));
    }
  }

  const issues = [
    ...duplicates(pages, "title"),
    ...duplicates(pages, "description"),
    ...pages.filter((page) => page.title.length > 68).map((page) => `title too long (${page.title.length}): ${page.url}`),
    ...pages.filter((page) => page.description.length > 160).map((page) => `description too long (${page.description.length}): ${page.url}`),
    ...pages.filter((page) => /\s…$/.test(page.description)).map((page) => `description has a bad ellipsis break: ${page.url}`),
  ];

  const keyFile = (await readFile(resolve(process.cwd(), `public${indexNowKeyPath}`), "utf8")).trim();
  if (keyFile !== indexNowKey) {
    issues.push(`IndexNow key file does not match ${indexNowKeyPath}.`);
  }

  if (issues.length > 0) {
    console.error(`SEO audit failed with ${issues.length} issue(s):`);
    console.error(issues.slice(0, 50).join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`SEO audit passed for ${pages.length} localized home and app pages.`);
  console.log(`Unique titles: ${new Set(pages.map((page) => page.title)).size}; unique descriptions: ${new Set(pages.map((page) => page.description)).size}.`);
  console.log(`IndexNow key file verified at ${indexNowKeyPath}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

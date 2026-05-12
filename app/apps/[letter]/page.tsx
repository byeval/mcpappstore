import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  activeAppIndexKeys,
  appIndexPath,
  appIndexTitle,
  groupAppsByIndexKey,
  normalizeAppIndexParam,
} from "@/lib/app-index";
import { listPublishedApps } from "@/lib/data";
import { formatMessage, localizedPath, type I18nMessages, type Locale } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import type { CatalogApp } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ letter: string }> }): Promise<Metadata> {
  const { letter } = await params;
  const key = normalizeAppIndexParam(letter);

  if (!key) {
    return {};
  }

  const title = appIndexTitle(key);
  return pageMetadata({
    title: `${title} MCP Servers | ChatGPT Apps & Claude Connectors`,
    description: `Browse ${title} MCP servers, ChatGPT apps, Claude connectors, and MCP tools. Compare publishers, categories, auth, prompts, and integration links.`,
    path: appIndexPath(key),
    keywords: [
      `MCP servers starting with ${title}`,
      `MCP apps starting with ${title}`,
      `ChatGPT apps starting with ${title}`,
      `Claude connectors starting with ${title}`,
      "MCP server directory",
      "MCP App Store",
    ],
  });
}

function appKindLabel(app: CatalogApp, copy: I18nMessages["appKind"]): string {
  const hasChatGpt = app.surfaces.some((surface) => surface.platform === "chatgpt");
  const hasClaude = app.surfaces.some((surface) => surface.platform === "claude");

  if (hasChatGpt && hasClaude) return copy.appAndConnector;
  return hasClaude ? copy.connector : copy.app;
}

function appPlatformLabel(app: CatalogApp, locale: Locale): string {
  const platforms = Array.from(new Set(app.surfaces.map((surface) => (surface.platform === "claude" ? "Claude" : "ChatGPT"))));

  if (locale === "ja" || locale === "zh") return platforms.join("、");
  if (locale === "es" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} y ${platforms[platforms.length - 1]}`;
  if (locale === "fr" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} et ${platforms[platforms.length - 1]}`;
  if (locale === "de" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} und ${platforms[platforms.length - 1]}`;
  if (locale === "ko" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} 및 ${platforms[platforms.length - 1]}`;
  return platforms.join(" and ");
}

function appSummaryLine(app: CatalogApp, locale: Locale, t: I18nMessages): string {
  const kind = appKindLabel(app, t.appKind);
  const platform = appPlatformLabel(app, locale);

  if (!platform) return kind;
  if (locale === "ja") return `${platform} 向け ${kind}`;
  if (locale === "zh") return `${platform} 版${kind}`;
  if (locale === "ko") return `${platform}용 ${kind}`;
  return `${kind} ${t.common.for} ${platform}`;
}

export default async function AppsLetterPage({ params }: { params: Promise<{ letter: string }> }) {
  const [{ locale, messages: t }, { letter }] = await Promise.all([getI18n(), params]);
  const href = (path: string) => localizedPath(path, locale);
  const key = normalizeAppIndexParam(letter);
  if (!key) {
    notFound();
  }

  const apps = await listPublishedApps();
  const groups = groupAppsByIndexKey(apps);
  const activeKeys = activeAppIndexKeys(apps);
  const groupApps = groups[key];

  if (groupApps.length === 0) {
    notFound();
  }

  const title = appIndexTitle(key);
  const latestTimestamp = groupApps.reduce((max, app) => Math.max(max, app.publishedAt ?? 0, app.updatedAt), 0);
  const lastUpdatedDate = new Date(latestTimestamp || Date.now()).toISOString().slice(0, 10);
  const lastUpdatedIso = new Date(latestTimestamp || Date.now()).toISOString();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.appsIndex.eyebrow}</p>
          <h1>{formatMessage(t.appsIndex.letterTitle, { letter: title })}</h1>
          <p className="section-copy">
            {formatMessage(t.appsIndex.letterCopy, { count: groupApps.length, letter: title })}
          </p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>

        <nav aria-label={t.appsIndex.browseByLetter} className="app-index-nav">
          <Link href={href("/store")} prefetch={false}>
            {t.common.all}
          </Link>
          {activeKeys.map((item) => (
            <Link
              aria-current={item === key ? "page" : undefined}
              className={item === key ? "active" : undefined}
              href={href(appIndexPath(item))}
              key={item}
              prefetch={false}
            >
              {appIndexTitle(item)}
              <span>{groups[item].length}</span>
            </Link>
          ))}
        </nav>

        <div className="app-index-list">
          {groupApps.map((app) => (
            <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
              <strong>{app.name}</strong>
              <span>
                {appSummaryLine(app, locale, t)}
                {app.publisher && app.publisher !== "Unknown" ? ` ${t.common.by} ${app.publisher}` : ""}
              </span>
              <p>{app.tagline}</p>
            </Link>
          ))}
        </div>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${title} MCP servers, apps, and connectors`,
            url: absoluteUrl(href(appIndexPath(key))),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: `${title} MCP servers, apps, and connectors`,
              numberOfItems: groupApps.length,
            },
          },
          itemListJsonLd(
            groupApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            `${title} MCP servers, apps, and connectors`,
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

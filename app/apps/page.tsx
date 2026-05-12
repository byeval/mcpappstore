import type { Metadata } from "next";
import Link from "next/link";

import { activeAppIndexKeys, appIndexPath, appIndexTitle, groupAppsByIndexKey } from "@/lib/app-index";
import { listPublishedApps } from "@/lib/data";
import { formatMessage, localizedPath, type I18nMessages, type Locale } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import type { CatalogApp } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "MCP server directory A-Z | ChatGPT apps & Claude connectors",
  description:
    "Browse the mcpapp MCP server directory A-Z, including ChatGPT apps, Claude connectors, categories, tools, and integration details.",
  path: "/store",
});

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

export default async function AppsIndexPage() {
  const [{ locale, messages: t }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const groups = groupAppsByIndexKey(apps);
  const activeKeys = activeAppIndexKeys(apps);
  const chatgptCount = apps.filter((app) => app.surfaces.some((surface) => surface.platform === "chatgpt")).length;
  const claudeCount = apps.filter((app) => app.surfaces.some((surface) => surface.platform === "claude")).length;
  const latestTimestamp = apps.reduce((max, app) => Math.max(max, app.publishedAt ?? 0, app.updatedAt), 0);
  const lastUpdatedDate = new Date(latestTimestamp || Date.now()).toISOString().slice(0, 10);
  const lastUpdatedIso = new Date(latestTimestamp || Date.now()).toISOString();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.appsIndex.eyebrow}</p>
          <h1>{t.appsIndex.title}</h1>
          <p className="section-copy">
            {formatMessage(t.appsIndex.copy, { count: apps.length })}
          </p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>

        <div className="app-index-metrics" aria-label={t.appsIndex.countsAria}>
          <div>
            <strong>{apps.length}</strong>
            <span>{t.appsIndex.totalListings}</span>
          </div>
          <div>
            <strong>{chatgptCount}</strong>
            <span>{t.appsIndex.chatgptApps}</span>
          </div>
          <div>
            <strong>{claudeCount}</strong>
            <span>{t.appsIndex.claudeConnectors}</span>
          </div>
        </div>

        <nav aria-label={t.appsIndex.browseByLetter} className="app-index-nav">
          {activeKeys.map((key) => (
            <Link href={href(appIndexPath(key))} key={key} prefetch={false}>
              {appIndexTitle(key)}
              <span>{groups[key].length}</span>
            </Link>
          ))}
        </nav>

        <section className="app-index-groups" aria-label={t.appsIndex.groupsAria}>
          {activeKeys.map((key) => (
            <div className="app-index-group" key={key}>
              <div className="app-index-group-head">
                <h2>{appIndexTitle(key)}</h2>
                <Link href={href(appIndexPath(key))} prefetch={false}>
                  {formatMessage(t.appsIndex.viewAll, { count: groups[key].length })}
                </Link>
              </div>
              <div className="app-index-mini-list">
                {groups[key].slice(0, 8).map((app) => (
                  <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                    <strong>{app.name}</strong>
                    <span>{appSummaryLine(app, locale, t)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t.appsIndex.title,
            url: absoluteUrl(href("/store")),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: "MCP server and app A-Z directory",
              numberOfItems: apps.length,
            },
          },
          itemListJsonLd(
            activeKeys.map((key) => ({ name: `${appIndexTitle(key)} MCP apps and servers`, path: appIndexPath(key) })),
            "MCP server and app A-Z directory",
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

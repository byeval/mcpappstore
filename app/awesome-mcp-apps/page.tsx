import type { Metadata } from "next";
import Link from "next/link";

import { AppCard } from "@/components/app-card";
import { countAppsByPlatform, listPublishedApps, listSitemapAppEntries } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";
import { absoluteUrl } from "@/lib/utils";

const builderResourceLinks = [
  {
    links: [
      { href: "https://modelcontextprotocol.io/docs/extensions/apps", label: "MCP Apps docs" },
      { href: "https://github.com/modelcontextprotocol/ext-apps", label: "ext-apps spec & SDK" },
      { href: "https://developers.openai.com/apps-sdk/concepts/ui-guidelines", label: "ChatGPT UI guidelines" },
      { href: "https://claude.com/docs/connectors/building/mcp-apps/design-guidelines", label: "Claude design guidelines" },
    ],
  },
  {
    links: [
      { href: "https://github.com/modelcontextprotocol/ext-apps/tree/main/examples", label: "Official examples" },
      { href: "/app/excalidraw-app-demo", label: "Excalidraw MCP" },
      { href: "/app/threejs-3d-viewer", label: "Three.js 3D Viewer" },
      { href: "/app/play-sheet-music", label: "Play Sheet Music" },
      { href: "/app/pdf-viewer", label: "PDF Viewer" },
      { href: "https://github.com/jgraph/drawio-mcp", label: "draw.io MCP" },
      { href: "https://github.com/psylch/mermaid-mcp-app", label: "Mermaid MCP app" },
    ],
  },
  {
    links: [
      { href: "https://github.com/mcp-use/mcp-use", label: "mcp-use" },
      { href: "https://github.com/alpic-ai/skybridge", label: "Skybridge" },
      { href: "https://github.com/AndurilCode/mcp-apps-kit", label: "mcp-apps-kit" },
      { href: "https://github.com/epicweb-dev/mcp-ui", label: "mcp-ui" },
    ],
  },
  {
    links: [
      { href: "https://github.com/MCPJam/inspector", label: "MCPJam Inspector" },
      { href: "https://github.com/sebderhy/mcp-app-template", label: "MCP app template" },
      { href: "https://github.com/vardior/mcp-app-fastmcp-example", label: "FastMCP example" },
      { href: "https://github.com/psylch/awesome-mcp-apps", label: "Source awesome list" },
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listSitemapAppEntries()]);
  const copy = staticPageCopy(locale).awesomeMcpApps;
  const listingText = apps.length.toLocaleString("en-US");

  return pageMetadata({
    title: formatMessage(copy.metaTitle, { count: listingText }),
    description: copy.pageDescription,
    path: "/awesome-mcp-apps",
    locale,
    keywords: [
      "awesome MCP apps",
      "awesome-mcp-apps",
      "awesome MCP servers",
      "MCP awesome list",
      "MCP apps GitHub",
      "Model Context Protocol apps",
      "ChatGPT apps",
      "Claude connectors",
    ],
  });
}

export default async function AwesomeMcpAppsPage() {
  const [{ locale, messages: t }, apps, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listPublishedApps(),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.awesomeMcpApps;
  const commonCopy = pageCopy.common;
  const href = (path: string) => localizedPath(path, locale);
  const totalListings = apps.length;
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.publishedAt ?? 0, app.updatedAt), 0);
  const lastUpdatedIso = new Date(lastUpdated || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const featuredApps = apps.slice(0, 24);
  const faqs = copy.faqs;

  return (
    <div className="page-stack">
      <section className="collection-hero awesome-hero">
        <div>
          <p className="eyebrow">{copy.pageTitle}</p>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <div className="collection-hero-actions awesome-hero-actions">
            <Link className="primary-link" href={href("/store")} prefetch={false}>
              {copy.browseAll}
            </Link>
            <Link className="secondary-link" href={href("/submit")} prefetch={false}>
              {copy.submit}
            </Link>
          </div>
          <div className="collection-hero-meta" aria-label={copy.metaAria}>
            <span>awesome-mcp-apps</span>
            <span>{formatMessage(t.common.updated, { date: lastUpdatedDate })}</span>
            <span>{copy.githubFriendly}</span>
          </div>
        </div>
        <aside className="collection-hero-panel awesome-hero-panel">
          <span>{copy.shareRoute}</span>
          <strong>{totalListings}</strong>
          <span>{copy.indexedSummary}</span>
          <a href="https://github.com/byeval/mcpappstore" rel="noreferrer" target="_blank">
            {copy.openRepo}
          </a>
        </aside>
      </section>

      <div className="app-index-metrics" aria-label={copy.metricsAria}>
        <div>
          <strong>{totalListings}</strong>
          <span>{copy.totalListings}</span>
        </div>
        <div>
          <strong>{chatgptCount}</strong>
          <span>{copy.chatgptListings}</span>
        </div>
        <div>
          <strong>{claudeCount}</strong>
          <span>{copy.claudeListings}</span>
        </div>
      </div>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-types-title">
        <div className="section-head compact">
          <p className="eyebrow">{copy.typesEyebrow}</p>
          <h2 id="awesome-types-title">{copy.typesTitle}</h2>
          <p className="section-copy">{copy.typesBody}</p>
        </div>
        <div className="collection-card-grid awesome-link-grid">
          {copy.appTypes.map((link) => (
            <Link className="collection-card" href={href(link.href)} key={link.href} prefetch={false}>
              <span className="learn-card-type">{copy.appType}</span>
              <h2>{link.label}</h2>
              <p>{link.summary}</p>
              <span className="collection-card-count">{copy.browseCategory}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-builder-title">
        <div className="section-head compact">
          <p className="eyebrow">{copy.resourcesEyebrow}</p>
          <h2 id="awesome-builder-title">{copy.resourcesTitle}</h2>
          <p className="section-copy">{copy.resourcesBody}</p>
        </div>
        <div className="collection-card-grid awesome-resource-grid">
          {copy.resourceGroups.map((group, index) => (
            <div className="collection-card awesome-resource-card" key={group.label}>
              <span className="learn-card-type">{copy.resourceGroup}</span>
              <h2>{group.label}</h2>
              <p>{group.summary}</p>
              <div className="awesome-resource-list">
                {(builderResourceLinks[index]?.links ?? []).map((link) => (
                  link.href.startsWith("/") ? (
                    <Link href={href(link.href)} key={link.href} prefetch={false}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                      {link.label}
                    </a>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="collection-card-grid awesome-link-grid" aria-label={copy.sectionsAria}>
        {copy.hubLinks.map((link) => (
          <Link className="collection-card" href={href(link.href)} key={link.href} prefetch={false}>
            <span className="learn-card-type">{copy.routeType}</span>
            <h2>{link.label}</h2>
            <p>{link.summary}</p>
            <span className="collection-card-count">{copy.openSection}</span>
          </Link>
        ))}
      </section>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-mcp-app-list">
        <div className="section-head compact">
          <p className="eyebrow">{copy.freshEyebrow}</p>
          <h2 id="awesome-mcp-app-list">{copy.freshTitle}</h2>
          <p className="section-copy">{copy.freshBody}</p>
        </div>
        <div className="app-grid">
          {featuredApps.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>

      <section className="article-faq category-faq" id="faq">
        <div className="section-head compact">
          <p className="eyebrow">{commonCopy.faq}</p>
          <h2>{copy.faqTitle}</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: copy.pageTitle,
            description: copy.pageDescription,
            url: absoluteUrl(href("/awesome-mcp-apps")),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: copy.pageTitle,
              numberOfItems: totalListings,
            },
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: copy.pageTitle, path: "/awesome-mcp-apps" },
          ]),
          itemListJsonLd(
            featuredApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            copy.pageTitle,
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

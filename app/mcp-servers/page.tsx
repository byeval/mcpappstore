import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, getCatalogQualityStats, getCategorySummaries, listMetadataRichApps, listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { faqJsonLd, formatCategoryName, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";
import type { CategorySummary } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

function categoryCount(categories: CategorySummary[], slug: string): number {
  return categories.find((category) => category.slug === slug)?.count ?? 0;
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const copy = staticPageCopy(locale).mcpServers;
  const totalListings = apps.length;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: formatMessage(copy.metaTitle, { count: listingText }),
    description: formatMessage(copy.metaDescription, { count: listingText }),
    path: "/mcp-servers",
    locale,
    keywords: [
      "MCP servers",
      "MCP server directory",
      "MCP servers list",
      "MCP directory",
      "ChatGPT apps",
      "Claude connectors",
    ],
  });
}

export default async function McpServersPage() {
  const [{ locale, messages: t }, apps, categories, qualityStats, serverExamples, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listPublishedApps(),
    getCategorySummaries(),
    getCatalogQualityStats(),
    listMetadataRichApps(10),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.mcpServers;
  const commonCopy = pageCopy.common;
  const href = (path: string) => localizedPath(path, locale);
  const totalListings = apps.length;
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.updatedAt), 0);
  const lastUpdatedIso = new Date(lastUpdated || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const httpCount = apps.filter((app) => app.mcpTransport === "http").length;
  const sseCount = apps.filter((app) => app.mcpTransport === "sse").length;
  const oauthCount = apps.filter((app) => app.authType === "oauth").length;
  const noAuthCount = apps.filter((app) => app.authType === "none").length;
  const withToolsCount = qualityStats.withToolsCount;
  const withPromptsCount = qualityStats.withExamplePromptsCount;
  const withRepoCount = qualityStats.withRepoCount;
  const topServerCategories = categories
    .filter((category) => category.count > 0 && copy.categoryNotes[category.slug])
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  const serverTypeRows = [
    {
      type: copy.rows.retrieval.type,
      href: "/category/data",
      count: categoryCount(categories, "data"),
      use: copy.rows.retrieval.use,
      check: copy.rows.retrieval.check,
    },
    {
      type: copy.rows.workspace.type,
      href: "/category/productivity",
      count: categoryCount(categories, "productivity"),
      use: copy.rows.workspace.use,
      check: copy.rows.workspace.check,
    },
    {
      type: copy.rows.developer.type,
      href: "/category/developer-tools",
      count: categoryCount(categories, "developer-tools") + categoryCount(categories, "code"),
      use: copy.rows.developer.use,
      check: copy.rows.developer.check,
    },
    {
      type: copy.rows.interactive.type,
      href: "/awesome-mcp-apps",
      count: apps.filter((app) => app.previews.length > 0 || app.categories.includes("design")).length,
      use: copy.rows.interactive.use,
      check: copy.rows.interactive.check,
    },
  ];
  const faqs = copy.faqs;

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="section-copy">{copy.intro}</p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>

        <div className="app-index-metrics" aria-label={copy.metricsAria}>
          <div>
            <strong>{totalListings}</strong>
            <span>{copy.totalListings}</span>
          </div>
          <div>
            <strong>{chatgptCount}</strong>
            <span>{copy.chatgptCompatible}</span>
          </div>
          <div>
            <strong>{claudeCount}</strong>
            <span>{copy.claudeCompatible}</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="mcp-servers-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">{copy.guideEyebrow}</p>
            <h2 id="mcp-servers-guide-title">{copy.guideTitle}</h2>
            <p>{copy.guideBody}</p>
            <div className="category-related-links">
              <Link href={href("/store")} prefetch={false}>{copy.relatedAll}</Link>
              <Link href={href("/mcp-directory")} prefetch={false}>{copy.relatedDirectory}</Link>
              <Link href={href("/chatgpt-connectors")} prefetch={false}>{copy.relatedChatgpt}</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>{copy.relatedClaude}</Link>
              <Link href={href("/category/productivity")} prefetch={false}>{copy.relatedProductivity}</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">{copy.reviewBeforeUse}</p>
            <ul>
              {copy.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-coverage-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.coverageEyebrow}</p>
            <h2 id="mcp-server-coverage-title">{copy.coverageTitle}</h2>
            <p>{copy.coverageBody}</p>
          </div>
          <div className="directory-card-grid">
            <div className="directory-card">
              <span>{copy.transportMix}</span>
              <strong>{formatNumber(httpCount)} HTTP / {formatNumber(sseCount)} SSE</strong>
              <p>{copy.transportMixDetail}</p>
            </div>
            <div className="directory-card">
              <span>{copy.permissionModel}</span>
              <strong>{formatNumber(oauthCount)} OAuth / {formatNumber(noAuthCount)} no-auth</strong>
              <p>{copy.permissionModelDetail}</p>
            </div>
            <div className="directory-card">
              <span>{copy.inspectionDepth}</span>
              <strong>{formatMessage(copy.inspectionDepthWithTools, { count: formatNumber(withToolsCount) })}</strong>
              <p>{formatMessage(copy.inspectionDepthDetail, { prompts: formatNumber(withPromptsCount), repos: formatNumber(withRepoCount) })}</p>
            </div>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-types-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.typeEyebrow}</p>
            <h2 id="mcp-server-types-title">{copy.typeTitle}</h2>
          </div>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>{copy.typeColumn}</th>
                  <th>{copy.goodFitColumn}</th>
                  <th>{copy.riskCheckColumn}</th>
                </tr>
              </thead>
              <tbody>
                {serverTypeRows.map((row) => (
                  <tr key={row.type}>
                    <td>
                      <Link href={href(row.href)} prefetch={false}>{row.type}</Link>
                      <span>{formatMessage(commonCopy.relatedListingsCount, { count: formatNumber(row.count) })}</span>
                    </td>
                    <td>{row.use}</td>
                    <td>{row.check}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-readiness-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.readinessEyebrow}</p>
            <h2 id="mcp-server-readiness-title">{copy.readinessTitle}</h2>
          </div>
          <div className="directory-card-grid directory-card-grid-four">
            {copy.readiness.map((item) => (
              <div className="directory-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-categories-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.categoriesEyebrow}</p>
            <h2 id="mcp-server-categories-title">{copy.categoriesTitle}</h2>
          </div>
          <div className="directory-link-grid">
            {topServerCategories.map((category) => (
              <Link className="directory-link-card" href={href(`/category/${category.slug}`)} key={category.slug} prefetch={false}>
                <span>{formatMessage(commonCopy.listingsCount, { count: formatNumber(category.count) })}</span>
                <strong>{formatCategoryName(category.name)}</strong>
                <p>{copy.categoryNotes[category.slug]}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-examples-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.examplesEyebrow}</p>
            <h2 id="mcp-server-examples-title">{copy.examplesTitle}</h2>
            <p>{copy.examplesBody}</p>
          </div>
          <div className="directory-example-list">
            {serverExamples.map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>
                  {appPlatformLabel(app)} · {app.mcpTransport.toUpperCase()} · {appMetadataSignal(app)}
                </small>
              </Link>
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
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: copy.title,
            url: absoluteUrl(href("/mcp-servers")),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: copy.title,
              numberOfItems: totalListings,
            },
          },
          itemListJsonLd(
            topServerCategories.map((category) => ({ name: `${formatCategoryName(category.name)} MCP servers`, path: `/category/${category.slug}` })),
            copy.categoryItemListName,
          ),
          itemListJsonLd(
            serverExamples.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            copy.examplesItemListName,
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, getCatalogQualityStats, getCategorySummaries, listMetadataRichApps, listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber, hasAppPlatform } from "@/lib/directory-content";
import { formatMessage } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { listMcpClients } from "@/lib/mcp-clients";
import { faqJsonLd, formatCategoryName, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.mcpDirectory;
  const totalListings = apps.length;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: formatMessage(copy.metaTitle, { count: listingText }),
    description: formatMessage(copy.metaDescription, { count: listingText }),
    path: "/mcp-directory",
    locale,
    keywords: [
      "MCP directory",
      "MCP server directory",
      "MCP servers",
      "MCP apps",
      "Model Context Protocol apps",
      "ChatGPT apps",
      "Claude connectors",
    ],
  });
}

export default async function McpDirectoryPage() {
  const [{ locale, messages: t }, apps, categories, qualityStats, representativeApps, chatgptCount, claudeCount, mcpClients] = await Promise.all([
    getI18n(),
    listPublishedApps(),
    getCategorySummaries(),
    getCatalogQualityStats(),
    listMetadataRichApps(8),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
    listMcpClients(),
  ]);
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.mcpDirectory;
  const commonCopy = pageCopy.common;
  const href = (path: string) => localizedPath(path, locale);
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.updatedAt), 0);
  const lastUpdatedDate = new Date(lastUpdated || Date.now()).toISOString().slice(0, 10);
  const totalListings = apps.length;
  const overlapCount = apps.filter((app) => hasAppPlatform(app, "chatgpt") && hasAppPlatform(app, "claude")).length;
  const oauthCount = apps.filter((app) => app.authType === "oauth").length;
  const noAuthCount = apps.filter((app) => app.authType === "none").length;
  const withToolsCount = qualityStats.withToolsCount;
  const withPromptsCount = qualityStats.withExamplePromptsCount;
  const withRepoCount = qualityStats.withRepoCount;
  const topCategories = categories
    .filter((category) => category.count > 0 && category.slug !== "featured")
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  const directoryRows = [
    {
      surface: copy.rows.chatgpt.surface,
      href: "/chatgpt-apps",
      count: chatgptCount,
      bestFor: copy.rows.chatgpt.bestFor,
      verify: copy.rows.chatgpt.verify,
    },
    {
      surface: copy.rows.claude.surface,
      href: "/claude-connectors",
      count: claudeCount,
      bestFor: copy.rows.claude.bestFor,
      verify: copy.rows.claude.verify,
    },
    {
      surface: copy.rows.crossHost.surface,
      href: "/mcp-servers",
      count: overlapCount,
      bestFor: copy.rows.crossHost.bestFor,
      verify: copy.rows.crossHost.verify,
    },
    {
      surface: copy.rows.clients.surface,
      href: "/mcp-clients",
      count: mcpClients.length,
      bestFor: copy.rows.clients.bestFor,
      verify: copy.rows.clients.verify,
    },
  ];
  const directoryFaqs = copy.faqs;

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
            <span>{copy.chatgptApps}</span>
          </div>
          <div>
            <strong>{claudeCount}</strong>
            <span>{copy.claudeConnectors}</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="mcp-directory-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">{copy.guideEyebrow}</p>
            <h2 id="mcp-directory-guide-title">{copy.guideTitle}</h2>
            <p>{copy.guideBody1}</p>
            <p>{copy.guideBody2}</p>
            <div className="category-related-links">
              <Link href={href("/store")} prefetch={false}>{copy.relatedAll}</Link>
              <Link href={href("/mcp-clients")} prefetch={false}>{copy.relatedClients}</Link>
              <Link href={href("/mcp-servers")} prefetch={false}>{copy.relatedServers}</Link>
              <Link href={href("/chatgpt-apps")} prefetch={false}>{copy.relatedChatgpt}</Link>
              <Link href={href("/chatgpt-connectors")} prefetch={false}>{copy.relatedChatgptConnectors}</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>{copy.relatedClaude}</Link>
              <Link href={href("/category/productivity")} prefetch={false}>{copy.relatedProductivity}</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">{copy.compareFirst}</p>
            <ul>
              {copy.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-coverage-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.coverageEyebrow}</p>
            <h2 id="directory-coverage-title">{copy.coverageTitle}</h2>
            <p>{copy.coverageBody}</p>
          </div>
          <div className="directory-card-grid">
            <div className="directory-card">
              <span>{copy.hostCoverage}</span>
              <strong>{formatNumber(chatgptCount)} ChatGPT / {formatNumber(claudeCount)} Claude</strong>
              <p>{formatMessage(copy.hostCoverageDetail, { count: formatNumber(overlapCount) })}</p>
            </div>
            <div className="directory-card">
              <span>{copy.authProfile}</span>
              <strong>{formatNumber(oauthCount)} OAuth / {formatNumber(noAuthCount)} no-auth</strong>
              <p>{copy.authProfileDetail}</p>
            </div>
            <div className="directory-card">
              <span>{copy.evaluationDetail}</span>
              <strong>{formatMessage(copy.evaluationDetailWithTools, { count: formatNumber(withToolsCount) })}</strong>
              <p>{formatMessage(copy.evaluationDetailDetail, { prompts: formatNumber(withPromptsCount), repos: formatNumber(withRepoCount) })}</p>
            </div>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-surface-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.surfaceEyebrow}</p>
            <h2 id="directory-surface-title">{copy.surfaceTitle}</h2>
          </div>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>{copy.surfaceColumn}</th>
                  <th>{copy.bestUseColumn}</th>
                  <th>{copy.reviewColumn}</th>
                </tr>
              </thead>
              <tbody>
                {directoryRows.map((row) => (
                  <tr key={row.surface}>
                    <td>
                      <Link href={href(row.href)} prefetch={false}>{row.surface}</Link>
                      <span>{formatMessage(commonCopy.listingsCount, { count: formatNumber(row.count) })}</span>
                    </td>
                    <td>{row.bestFor}</td>
                    <td>{row.verify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-categories-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.categoryEyebrow}</p>
            <h2 id="directory-categories-title">{copy.categoryTitle}</h2>
            <p>{copy.categoryBody}</p>
          </div>
          <div className="directory-link-grid">
            {topCategories.map((category) => (
              <Link className="directory-link-card" href={href(`/category/${category.slug}`)} key={category.slug} prefetch={false}>
                <span>{formatNumber(category.count)} listings</span>
                <strong>{formatCategoryName(category.name)}</strong>
                <p>{copy.categoryNotes[category.slug] ?? copy.defaultCategoryNote}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-examples-title">
          <div className="directory-section-head">
            <p className="eyebrow">{copy.examplesEyebrow}</p>
            <h2 id="directory-examples-title">{copy.examplesTitle}</h2>
            <p>{copy.examplesBody}</p>
          </div>
          <div className="directory-example-list">
            {representativeApps.map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>
                  {appPlatformLabel(app)} · {appMetadataSignal(app)} · {app.authType === "oauth" ? "OAuth" : copy.noAuth}
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
            {directoryFaqs.map((item) => (
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
            name: "MCP directory",
            url: absoluteUrl(href("/mcp-directory")),
            dateModified: new Date(lastUpdated || Date.now()).toISOString(),
            mainEntity: {
              "@type": "ItemList",
              name: copy.title,
              numberOfItems: totalListings,
            },
          },
          itemListJsonLd(
            [
              { name: "MCP directory A-Z", path: "/store" },
              { name: "MCP clients", path: "/mcp-clients" },
              { name: "MCP servers", path: "/mcp-servers" },
              { name: "ChatGPT apps", path: "/chatgpt-apps" },
              { name: "ChatGPT connectors", path: "/chatgpt-connectors" },
              { name: "Claude connectors", path: "/claude-connectors" },
              { name: "Productivity MCP apps", path: "/category/productivity" },
            ],
            copy.itemListName,
          ),
          itemListJsonLd(
            topCategories.map((category) => ({ name: `${formatCategoryName(category.name)} MCP listings`, path: `/category/${category.slug}` })),
            copy.categoryItemListName,
          ),
          itemListJsonLd(
            representativeApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            copy.examplesItemListName,
          ),
          faqJsonLd(directoryFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

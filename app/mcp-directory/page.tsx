import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, getCatalogQualityStats, getCategorySummaries, listMetadataRichApps, listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber, hasAppPlatform } from "@/lib/directory-content";
import { formatMessage } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { faqJsonLd, formatCategoryName, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

const categoryNotes: Record<string, string> = {
  productivity: "Tasks, calendars, docs, meetings, and daily workspace automation.",
  lifestyle: "Consumer workflows such as travel, food, music, shopping, and personal planning.",
  "financial-services": "Banking, accounting, market data, payments, and finance operations.",
  data: "Analytics, BI, spreadsheets, datasets, search, and structured data exploration.",
  business: "CRM, operations, customer support, hiring, and back-office workflows.",
  travel: "Trip planning, hotels, flights, itineraries, and local recommendations.",
  code: "Developer docs, code search, debugging, repositories, and engineering tools.",
  finance: "Investment research, financial documents, filings, and market analysis.",
  "sales-and-marketing": "Campaigns, ads, attribution, enrichment, and pipeline operations.",
  communication: "Email, meetings, messaging, transcripts, and team collaboration.",
  "developer-tools": "Build, deploy, test, debug, inspect, and automate software workflows.",
};

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const totalListings = apps.length;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: `MCP directory: ${listingText} MCP servers, ChatGPT apps, and Claude connectors`,
    description:
      `Browse ${listingText} MCP servers and MCP apps in one directory for ChatGPT apps and Claude connectors, with categories, tools, auth patterns, and integration details.`,
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
  const [{ locale, messages: t }, apps, categories, qualityStats, representativeApps, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listPublishedApps(),
    getCategorySummaries(),
    getCatalogQualityStats(),
    listMetadataRichApps(8),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
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
      surface: "ChatGPT apps",
      href: "/chatgpt-apps",
      count: chatgptCount,
      bestFor: "User-facing workflows inside ChatGPT: search, creation, editing, booking, analysis, and task completion.",
      verify: "Check account scope, tool behavior, and whether the app can read or write external data.",
    },
    {
      surface: "Claude connectors",
      href: "/claude-connectors",
      count: claudeCount,
      bestFor: "Claude workspaces that need files, meetings, CRM data, docs, databases, and internal tools in context.",
      verify: "Review OAuth requirements, organization controls, and whether actions need human approval.",
    },
    {
      surface: "Cross-host listings",
      href: "/mcp-servers",
      count: overlapCount,
      bestFor: "Teams comparing the same integration across ChatGPT and Claude before standardizing a workflow.",
      verify: "Confirm feature parity, transport support, support channels, and fallback behavior per host.",
    },
  ];
  const directoryFaqs = [
    {
      question: "What makes this MCP directory different from a plain list of links?",
      answer:
        "Each listing is normalized with platform coverage, categories, auth pattern, transport, tools, prompts, publisher metadata, and detail-page links so builders can compare integrations before connecting them.",
    },
    {
      question: "Which pages should I use first?",
      answer:
        "Use the MCP directory for a full catalog view, ChatGPT apps when the target host is ChatGPT, Claude connectors when the target host is Claude, and category pages when the workflow is more important than the host.",
    },
    {
      question: "How should production teams shortlist MCP servers or apps?",
      answer:
        "Start with host compatibility, then verify auth type, permission scope, write actions, publisher trust, docs, support path, and whether the listing exposes enough tools or prompts for the intended workflow.",
    },
  ];

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">MCP directory</p>
          <h1>MCP servers, ChatGPT apps, and Claude connectors</h1>
          <p className="section-copy">
            Browse a structured MCP server directory with platform coverage, category pages, and listing-level details so teams can compare integrations before connecting.
          </p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>

        <div className="app-index-metrics" aria-label="MCP directory counts">
          <div>
            <strong>{totalListings}</strong>
            <span>Total listings</span>
          </div>
          <div>
            <strong>{chatgptCount}</strong>
            <span>ChatGPT apps</span>
          </div>
          <div>
            <strong>{claudeCount}</strong>
            <span>Claude connectors</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="mcp-directory-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">How to use this directory</p>
            <h2 id="mcp-directory-guide-title">Compare by platform, scope, and workflow</h2>
            <p>
              Start with the platform surface users need first (ChatGPT apps or Claude connectors), then narrow by category and listing details such as tools, auth, and transport.
            </p>
            <p>
              For production use, favor integrations with clear publisher metadata, reviewable permissions, and workflow-specific examples.
            </p>
            <div className="category-related-links">
              <Link href={href("/store")} prefetch={false}>Browse all MCP listings A-Z</Link>
              <Link href={href("/mcp-servers")} prefetch={false}>Browse MCP servers</Link>
              <Link href={href("/chatgpt-apps")} prefetch={false}>Browse ChatGPT apps</Link>
              <Link href={href("/chatgpt-connectors")} prefetch={false}>ChatGPT connectors guide</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>Browse Claude connectors</Link>
              <Link href={href("/category/productivity")} prefetch={false}>Browse productivity MCP apps</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">Compare first</p>
            <ul>
              <li>Host compatibility: ChatGPT, Claude, or both.</li>
              <li>Action scope: read-only retrieval vs write-capable workflows.</li>
              <li>Operational fit: auth, rate limits, support, and update cadence.</li>
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-coverage-title">
          <div className="directory-section-head">
            <p className="eyebrow">Directory coverage</p>
            <h2 id="directory-coverage-title">What this catalog tracks for MCP adoption</h2>
            <p>
              The useful part of an MCP directory is not the raw count. It is whether a team can tell what host an
              integration supports, what kind of access it needs, and whether the listing has enough operational context
              to be safely evaluated.
            </p>
          </div>
          <div className="directory-card-grid">
            <div className="directory-card">
              <span>Host coverage</span>
              <strong>{formatNumber(chatgptCount)} ChatGPT / {formatNumber(claudeCount)} Claude</strong>
              <p>{formatNumber(overlapCount)} listings appear on both host surfaces, which is useful for parity checks.</p>
            </div>
            <div className="directory-card">
              <span>Auth profile</span>
              <strong>{formatNumber(oauthCount)} OAuth / {formatNumber(noAuthCount)} no-auth</strong>
              <p>Use auth type as the first risk filter before reviewing write actions or workspace permissions.</p>
            </div>
            <div className="directory-card">
              <span>Evaluation detail</span>
              <strong>{formatNumber(withToolsCount)} with tools</strong>
              <p>{formatNumber(withPromptsCount)} listings include example prompts; {formatNumber(withRepoCount)} expose a GitHub repo.</p>
            </div>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-surface-title">
          <div className="directory-section-head">
            <p className="eyebrow">Choose the right surface</p>
            <h2 id="directory-surface-title">Start from host, then narrow by workflow and risk</h2>
          </div>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Surface</th>
                  <th>Best use case</th>
                  <th>Review before connecting</th>
                </tr>
              </thead>
              <tbody>
                {directoryRows.map((row) => (
                  <tr key={row.surface}>
                    <td>
                      <Link href={href(row.href)} prefetch={false}>{row.surface}</Link>
                      <span>{formatNumber(row.count)} listings</span>
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
            <p className="eyebrow">High-volume categories</p>
            <h2 id="directory-categories-title">Where most MCP listings cluster</h2>
            <p>
              Category pages are the fastest way to move from a generic "MCP server" search into concrete tasks like
              productivity, analytics, finance, development, travel, or customer operations.
            </p>
          </div>
          <div className="directory-link-grid">
            {topCategories.map((category) => (
              <Link className="directory-link-card" href={href(`/category/${category.slug}`)} key={category.slug} prefetch={false}>
                <span>{formatNumber(category.count)} listings</span>
                <strong>{formatCategoryName(category.name)}</strong>
                <p>{categoryNotes[category.slug] ?? "Compare tools, hosts, auth patterns, and workflow fit in this category."}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="directory-examples-title">
          <div className="directory-section-head">
            <p className="eyebrow">Representative listings</p>
            <h2 id="directory-examples-title">Examples with enough metadata to evaluate</h2>
            <p>
              These listings expose practical evaluation signals such as tools, prompts, platform coverage, or source
              links. Use them as examples of what a high-quality detail page should make clear.
            </p>
          </div>
          <div className="directory-example-list">
            {representativeApps.map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>
                  {appPlatformLabel(app)} · {appMetadataSignal(app)} · {app.authType === "oauth" ? "OAuth" : "No auth"}
                </small>
              </Link>
            ))}
          </div>
        </section>

        <section className="article-faq category-faq" id="faq">
          <div className="section-head compact">
            <p className="eyebrow">FAQ</p>
            <h2>MCP directory FAQ</h2>
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
              name: "MCP server directory",
              numberOfItems: totalListings,
            },
          },
          itemListJsonLd(
            [
              { name: "MCP directory A-Z", path: "/store" },
              { name: "MCP servers", path: "/mcp-servers" },
              { name: "ChatGPT apps", path: "/chatgpt-apps" },
              { name: "ChatGPT connectors", path: "/chatgpt-connectors" },
              { name: "Claude connectors", path: "/claude-connectors" },
              { name: "Productivity MCP apps", path: "/category/productivity" },
            ],
            "MCP directory sections",
          ),
          itemListJsonLd(
            topCategories.map((category) => ({ name: `${formatCategoryName(category.name)} MCP listings`, path: `/category/${category.slug}` })),
            "High-volume MCP directory categories",
          ),
          itemListJsonLd(
            representativeApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            "Representative MCP directory listings",
          ),
          faqJsonLd(directoryFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, getCatalogQualityStats, getCategorySummaries, listMetadataRichApps, listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { faqJsonLd, formatCategoryName, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import type { CategorySummary } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

const serverCategoryNotes: Record<string, string> = {
  productivity: "Workspace servers for tasks, calendars, docs, meetings, and collaboration.",
  data: "Query, summarize, transform, and visualize structured business or public data.",
  code: "Developer servers for docs, repositories, debugging, code search, and engineering support.",
  "developer-tools": "Build, deploy, test, inspect, automate, and operate software workflows.",
  business: "Operations, CRM, support, hiring, and back-office systems.",
  "financial-services": "Accounting, financial records, market data, filings, and banking workflows.",
  communication: "Email, messaging, meetings, transcripts, and team knowledge.",
  design: "Canvases, diagrams, creative tools, previews, and design-to-code workflows.",
};

function categoryCount(categories: CategorySummary[], slug: string): number {
  return categories.find((category) => category.slug === slug)?.count ?? 0;
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const totalListings = apps.length;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: `MCP servers directory: ${listingText} MCP server listings for ChatGPT and Claude`,
    description:
      `Explore ${listingText} MCP servers with category filters, platform support, and connector details for ChatGPT apps and Claude connectors.`,
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
    .filter((category) => category.count > 0 && serverCategoryNotes[category.slug])
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  const serverTypeRows = [
    {
      type: "Retrieval and search servers",
      href: "/category/data",
      count: categoryCount(categories, "data"),
      use: "Best when the assistant should find, summarize, or cite information without changing external state.",
      check: "Confirm source freshness, citation behavior, query limits, and whether private data leaves the workspace.",
    },
    {
      type: "Workspace action servers",
      href: "/category/productivity",
      count: categoryCount(categories, "productivity"),
      use: "Best for calendars, tasks, docs, email, CRM, support queues, and operational workflows.",
      check: "Separate read-only access from write actions, and require approval for destructive or external-facing steps.",
    },
    {
      type: "Developer and ops servers",
      href: "/category/developer-tools",
      count: categoryCount(categories, "developer-tools") + categoryCount(categories, "code"),
      use: "Best for repositories, code search, deployment, debugging, browser automation, and observability.",
      check: "Review repo permissions, secret exposure, environment access, command execution, and audit logs.",
    },
    {
      type: "Interactive app-style servers",
      href: "/awesome-mcp-apps",
      count: apps.filter((app) => app.previews.length > 0 || app.categories.includes("design")).length,
      use: "Best when the server renders a UI surface such as diagrams, design canvases, PDFs, maps, or media tools.",
      check: "Check host UI support, iframe/resource permissions, content security policy, and fallback text behavior.",
    },
  ];
  const faqs = [
    {
      question: "What is the difference between MCP servers and MCP apps?",
      answer:
        "MCP servers expose tools, resources, and prompts over the Model Context Protocol. MCP apps or connectors package those capabilities for a host such as ChatGPT or Claude, sometimes with an interactive UI surface.",
    },
    {
      question: "How should I choose an MCP server for production?",
      answer:
        "Prioritize host compatibility, auth model, permission scope, write actions, publisher trust, maintenance cadence, support path, and clear operational documentation before enabling the server in real workflows.",
    },
    {
      question: "Are all listings open source MCP servers?",
      answer:
        "No. The catalog includes open-source examples, hosted MCP servers, ChatGPT apps, and Claude connectors. Use the GitHub repository field where available, and check publisher metadata when the implementation is closed source.",
    },
    {
      question: "What should I verify before connecting an MCP server to company data?",
      answer:
        "Review OAuth scopes, whether tools can write or delete data, where data is processed, rate limits, logging behavior, failure modes, and how users can disconnect or revoke access.",
    },
  ];

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">MCP servers</p>
          <h1>MCP servers directory for ChatGPT and Claude workflows</h1>
          <p className="section-copy">
            Use this MCP server directory page to compare platform coverage, category fit, and integration readiness before connecting servers to production assistants.
          </p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>

        <div className="app-index-metrics" aria-label="MCP server directory counts">
          <div>
            <strong>{totalListings}</strong>
            <span>Total MCP server listings</span>
          </div>
          <div>
            <strong>{chatgptCount}</strong>
            <span>ChatGPT-compatible listings</span>
          </div>
          <div>
            <strong>{claudeCount}</strong>
            <span>Claude-compatible listings</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="mcp-servers-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">Selection guide</p>
            <h2 id="mcp-servers-guide-title">Compare MCP servers by host support and task type</h2>
            <p>
              Start with host support, then filter by workflow intent like search, coding, docs, or productivity. Prefer providers with transparent docs and clear operational boundaries.
            </p>
            <div className="category-related-links">
              <Link href={href("/store")} prefetch={false}>Browse all MCP listings</Link>
              <Link href={href("/mcp-directory")} prefetch={false}>Open full MCP directory guide</Link>
              <Link href={href("/chatgpt-connectors")} prefetch={false}>Compare ChatGPT connectors</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>Compare Claude connectors</Link>
              <Link href={href("/category/productivity")} prefetch={false}>Browse productivity MCP apps</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">Review before use</p>
            <ul>
              <li>Host compatibility and fallback behavior.</li>
              <li>Permission scope and write actions.</li>
              <li>Maintenance cadence and integration docs.</li>
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-coverage-title">
          <div className="directory-section-head">
            <p className="eyebrow">Coverage signals</p>
            <h2 id="mcp-server-coverage-title">What the directory can tell you before install</h2>
            <p>
              A useful MCP server page should help builders decide whether an integration is worth opening, not just
              repeat the protocol name. These signals summarize transport, authentication, and review depth across the
              current catalog.
            </p>
          </div>
          <div className="directory-card-grid">
            <div className="directory-card">
              <span>Transport mix</span>
              <strong>{formatNumber(httpCount)} HTTP / {formatNumber(sseCount)} SSE</strong>
              <p>Most hosted listings are HTTP-based; verify local or stdio setup on the detail page when needed.</p>
            </div>
            <div className="directory-card">
              <span>Permission model</span>
              <strong>{formatNumber(oauthCount)} OAuth / {formatNumber(noAuthCount)} no-auth</strong>
              <p>OAuth listings need scope review; no-auth listings still need data-flow and rate-limit checks.</p>
            </div>
            <div className="directory-card">
              <span>Inspection depth</span>
              <strong>{formatNumber(withToolsCount)} with tools</strong>
              <p>{formatNumber(withPromptsCount)} include example prompts; {formatNumber(withRepoCount)} include GitHub repository links.</p>
            </div>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-types-title">
          <div className="directory-section-head">
            <p className="eyebrow">Server type matrix</p>
            <h2 id="mcp-server-types-title">Match the MCP server to the job it will perform</h2>
          </div>
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Server type</th>
                  <th>Good fit</th>
                  <th>Risk check</th>
                </tr>
              </thead>
              <tbody>
                {serverTypeRows.map((row) => (
                  <tr key={row.type}>
                    <td>
                      <Link href={href(row.href)} prefetch={false}>{row.type}</Link>
                      <span>{formatNumber(row.count)} related listings</span>
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
            <p className="eyebrow">Production readiness</p>
            <h2 id="mcp-server-readiness-title">A practical checklist for MCP server review</h2>
          </div>
          <div className="directory-card-grid directory-card-grid-four">
            <div className="directory-card">
              <span>1. Scope</span>
              <strong>Read, write, or execute?</strong>
              <p>Separate passive retrieval from actions that send messages, update records, run commands, or spend money.</p>
            </div>
            <div className="directory-card">
              <span>2. Identity</span>
              <strong>Who owns access?</strong>
              <p>Check publisher, OAuth scopes, workspace controls, user consent, and how access can be revoked.</p>
            </div>
            <div className="directory-card">
              <span>3. Behavior</span>
              <strong>What tools exist?</strong>
              <p>Review tool names, example prompts, fallback behavior, errors, rate limits, and auditability.</p>
            </div>
            <div className="directory-card">
              <span>4. Maintenance</span>
              <strong>Can it be trusted later?</strong>
              <p>Prefer clear docs, support links, GitHub repos when available, and evidence of recent updates.</p>
            </div>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-categories-title">
          <div className="directory-section-head">
            <p className="eyebrow">Common MCP server categories</p>
            <h2 id="mcp-server-categories-title">Browse by the workflow you need to automate</h2>
          </div>
          <div className="directory-link-grid">
            {topServerCategories.map((category) => (
              <Link className="directory-link-card" href={href(`/category/${category.slug}`)} key={category.slug} prefetch={false}>
                <span>{formatNumber(category.count)} listings</span>
                <strong>{formatCategoryName(category.name)}</strong>
                <p>{serverCategoryNotes[category.slug]}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="mcp-server-examples-title">
          <div className="directory-section-head">
            <p className="eyebrow">Representative MCP listings</p>
            <h2 id="mcp-server-examples-title">Examples with tools, endpoints, prompts, or install context</h2>
            <p>
              Use these detail pages to inspect the kind of metadata that should exist before a server is connected to
              a real assistant workflow.
            </p>
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
            <p className="eyebrow">FAQ</p>
            <h2>MCP servers FAQ</h2>
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
            name: "MCP servers directory",
            url: absoluteUrl(href("/mcp-servers")),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: "MCP servers",
              numberOfItems: totalListings,
            },
          },
          itemListJsonLd(
            topServerCategories.map((category) => ({ name: `${formatCategoryName(category.name)} MCP servers`, path: `/category/${category.slug}` })),
            "MCP server categories",
          ),
          itemListJsonLd(
            serverExamples.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            "Representative MCP server listings",
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, listSitemapAppEntries } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { faqJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listSitemapAppEntries()]);
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
  const [{ locale, messages: t }, apps, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listSitemapAppEntries(),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
  const href = (path: string) => localizedPath(path, locale);
  const totalListings = apps.length;
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.updatedAt), 0);
  const lastUpdatedIso = new Date(lastUpdated || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const faqs = [
    {
      question: "What is the difference between MCP servers and MCP apps?",
      answer:
        "MCP servers expose tools and resources. MCP apps package those capabilities for client UIs such as ChatGPT or Claude.",
    },
    {
      question: "How should I choose an MCP server for production?",
      answer:
        "Prioritize security controls, permission scope, host compatibility, update cadence, and clear operational documentation.",
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
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

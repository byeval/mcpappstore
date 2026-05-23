import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, listSitemapAppEntries } from "@/lib/data";
import { formatMessage } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listSitemapAppEntries()]);
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
  const [{ locale, messages: t }, apps, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listSitemapAppEntries(),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
  const href = (path: string) => localizedPath(path, locale);
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.updatedAt), 0);
  const lastUpdatedDate = new Date(lastUpdated || Date.now()).toISOString().slice(0, 10);
  const totalListings = apps.length;

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
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

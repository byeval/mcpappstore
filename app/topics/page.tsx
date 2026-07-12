import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApps } from "@/lib/data";
import { formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { listTopicApps, mcpTopics } from "@/lib/topics";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return pageMetadata({
    title: "MCP topics for high-intent agent workflows",
    description:
      "Browse focused MCP topic guides for browser automation, RAG, OpenAPI, PDF, coding agents, databases, DevOps, security, finance, and more.",
    path: "/topics",
    locale,
    keywords: ["MCP topics", "MCP guides", "browser automation MCP", "RAG MCP", "database MCP"],
  });
}

export default async function TopicsPage() {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const cards = mcpTopics.map((topic) => ({ topic, count: listTopicApps(topic, apps).length }));

  return (
    <div className="page-stack">
      <section className="collection-hero">
        <div>
          <p className="eyebrow">Topic index</p>
          <h1>MCP topics</h1>
          <p>Focused guides for high-intent MCP workflows, each backed by matching apps, connectors, servers, and tools from the directory.</p>
        </div>
        <div className="collection-hero-panel">
          <strong>{mcpTopics.length}</strong>
          <span>workflow guides</span>
        </div>
      </section>

      <section className="collection-card-grid" aria-label="MCP topic guides">
        {cards.map(({ topic, count }) => (
          <Link className="collection-card" href={href(`/topics/${topic.slug}`)} key={topic.slug} prefetch={false}>
            <span className="learn-card-type">MCP topic</span>
            <h2>{topic.title}</h2>
            <p>{topic.summary}</p>
            <span className="collection-card-count">{formatNumber(count)} matching listings</span>
          </Link>
        ))}
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(mcpTopics.map((topic) => ({ name: topic.title, path: `/topics/${topic.slug}` })), "MCP topics"),
        )}
        type="application/ld+json"
      />
    </div>
  );
}

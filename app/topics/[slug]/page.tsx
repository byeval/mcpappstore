import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { getMcpTopic, listTopicApps, mcpTopics } from "@/lib/topics";

export async function generateStaticParams() {
  return mcpTopics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ locale }, { slug }] = await Promise.all([getI18n(), params]);
  const topic = getMcpTopic(slug);
  if (!topic) return {};
  return pageMetadata({
    title: `${topic.title}: apps, servers, connectors, and prompts`,
    description: topic.description,
    path: `/topics/${topic.slug}`,
    locale,
    keywords: topic.keywords,
  });
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ locale }, apps, { slug }] = await Promise.all([getI18n(), listPublishedApps(), params]);
  const topic = getMcpTopic(slug);
  if (!topic) notFound();

  const href = (path: string) => localizedPath(path, locale);
  const matchingApps = listTopicApps(topic, apps);
  const featured = matchingApps.slice(0, 12);
  const latest = [...matchingApps].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 24);
  const remoteCount = matchingApps.filter((app) => app.mcpTransport === "http" || app.mcpTransport === "sse").length;
  const toolCount = matchingApps.filter((app) => app.tools.length > 0).length;
  const repoCount = matchingApps.filter((app) => Boolean(app.repoUrl)).length;
  const linkedCategorySlugs = topic.categorySlugs.filter((categorySlug) =>
    matchingApps.some((app) => app.categories.includes(categorySlug)),
  );

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <nav className="crumbs">
          <Link href={href("/topics")} prefetch={false}>Topics</Link>
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <span>{topic.shortTitle}</span>
        </nav>

        <div className="section-head">
          <p className="eyebrow">MCP topic</p>
          <h1>{topic.title}</h1>
          <p className="section-copy">{topic.description}</p>
        </div>

        <div className="app-index-metrics" aria-label={`${topic.title} metrics`}>
          <div>
            <strong>{formatNumber(matchingApps.length)}</strong>
            <span>matching listings</span>
          </div>
          <div>
            <strong>{formatNumber(remoteCount)}</strong>
            <span>remote-ready</span>
          </div>
          <div>
            <strong>{formatNumber(toolCount + repoCount)}</strong>
            <span>with tools or repos</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="topic-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">How to evaluate</p>
            <h2 id="topic-guide-title">{topic.shortTitle} workflows need evidence, scope, and review</h2>
            <p>{topic.summary}</p>
            <div className="category-related-links">
              {linkedCategorySlugs.slice(0, 5).map((slug) => (
                <Link href={href(`/category/${slug}`)} key={slug} prefetch={false}>{slug.replaceAll("-", " ")}</Link>
              ))}
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">Checklist</p>
            <ul>
              {topic.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="topic-featured-title">
          <div className="directory-section-head">
            <p className="eyebrow">Featured matches</p>
            <h2 id="topic-featured-title">Start with listings that expose useful metadata</h2>
          </div>
          <div className="directory-example-list">
            {featured.map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>{appPlatformLabel(app)} · {app.mcpTransport.toUpperCase()} · {appMetadataSignal(app)}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="topic-prompts-title">
          <div className="directory-section-head">
            <p className="eyebrow">Prompt patterns</p>
            <h2 id="topic-prompts-title">Try prompts like this</h2>
          </div>
          <div className="directory-card-grid">
            {topic.prompts.map((prompt) => (
              <div className="directory-card" key={prompt}>
                <span>Prompt</span>
                <strong>{prompt}</strong>
                <p>Use this as a starting point, then add source boundaries, auth limits, and confirmation requirements for your team.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="topic-latest-title">
          <div className="directory-section-head">
            <p className="eyebrow">More matches</p>
            <h2 id="topic-latest-title">Related MCP apps and connectors</h2>
          </div>
          <div className="directory-link-grid">
            {latest.map((app) => (
              <Link className="directory-link-card" href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <span>{appPlatformLabel(app) || "MCP"} · {app.authType}</span>
                <strong>{app.name}</strong>
                <p>{app.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(matchingApps.slice(0, 100).map((app) => ({ name: app.name, path: `/app/${app.id}` })), topic.title),
        )}
        type="application/ld+json"
      />
    </div>
  );
}

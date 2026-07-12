import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApps } from "@/lib/data";
import { formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { popularSearches } from "@/lib/topics";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return pageMetadata({
    title: "Popular MCP searches",
    description:
      "Quick links for popular MCP searches including GitHub, Slack, Stripe, Supabase, Notion, Playwright, Postgres, Gmail, Jira, Linear, and more.",
    path: "/popular-searches",
    locale,
    keywords: ["popular MCP searches", "MCP apps search", "MCP directory"],
  });
}

export default async function PopularSearchesPage() {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const rows = popularSearches.map((term) => {
    const normalized = term.toLowerCase();
    const matches = apps.filter((app) =>
      [app.name, app.tagline, app.description, app.publisher, ...app.categories, ...app.tags].join(" ").toLowerCase().includes(normalized),
    );
    return { term, matches };
  });

  return (
    <div className="page-stack">
      <section className="collection-hero">
        <div>
          <p className="eyebrow">Popular searches</p>
          <h1>Fast paths into the MCP directory</h1>
          <p>High-intent product and workflow searches mapped to matching ChatGPT apps, Claude connectors, MCP servers, clients, and skills.</p>
        </div>
        <div className="collection-hero-panel">
          <strong>{popularSearches.length}</strong>
          <span>search paths</span>
        </div>
      </section>

      <section className="directory-link-grid" aria-label="Popular MCP searches">
        {rows.map(({ term, matches }) => (
          <Link className="directory-link-card" href={href(`/search?q=${encodeURIComponent(term)}`)} key={term} prefetch={false}>
            <span>{formatNumber(matches.length)} matches</span>
            <strong>{term}</strong>
            <p>{matches.slice(0, 3).map((app) => app.name).join(", ") || "Search the full catalog for related MCP listings."}</p>
          </Link>
        ))}
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(popularSearches.map((term) => ({ name: term, path: `/search?q=${encodeURIComponent(term)}` })), "Popular MCP searches"),
        )}
        type="application/ld+json"
      />
    </div>
  );
}

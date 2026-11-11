import Link from "next/link";
import { CatalogSearch } from "@/components/catalog-search";
import { discoveryCopy } from "@/lib/discovery-copy";
import type { Metadata } from "next";

import { AppCard } from "@/components/app-card";
import { searchApps } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata, truncateMeta } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string }>;
}): Promise<Metadata> {
  const [{ locale }, { q = "" }] = await Promise.all([getI18n(), searchParams]);
  const query = q.trim();

  if (!query) {
    return pageMetadata({
      title: "Search MCP servers, apps, and connectors",
      description: "Search MCP servers, MCP apps, ChatGPT apps, Claude connectors, tools, categories, and publishers.",
      path: "/search",
      locale,
      robots: {
        index: false,
        follow: true,
      },
    });
  }

  const shortQuery = truncateMeta(query, 64);
  return pageMetadata({
    title: `Search results for ${shortQuery}`,
    description: `MCP server, app, and connector search results matching ${shortQuery}.`,
    path: "/search",
    locale,
    robots: {
      index: false,
      follow: true,
    },
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string }>;
}) {
  const { locale, messages: t } = await getI18n();
  const { q: rawQuery = "", platform: rawPlatform = "" } = await searchParams;
  const q = rawQuery.trim().slice(0, 200);
  const platform = rawPlatform === "chatgpt" || rawPlatform === "claude" ? rawPlatform : undefined;
  const results = q || platform ? await searchApps(q, platform) : [];
  const href = (path: string) => localizedPath(path, locale);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.searchPage.eyebrow}</p>
          <h1>{t.searchPage.title}</h1>
        </div>
        <CatalogSearch locale={locale} messages={t} query={q} platform={platform} />
        {q || platform ? <p className="section-copy">{formatMessage(t.searchPage.results, { count: results.length, query: q })}</p> : null}
        {(q || platform) && results.length === 0 ? <div className="empty-collection"><h2>{discoveryCopy(locale).emptyTitle}</h2><p>{discoveryCopy(locale).emptyBody}</p><Link href={href("/store")}>{t.common.all} {t.common.apps}</Link></div> : null}
        {results.length === 96 ? <p className="evidence-note">{locale === "zh-hans" ? "显示前 96 个匹配结果，请添加关键词缩小范围。" : "Showing the first 96 matches. Refine your search to narrow the results."}</p> : null}
        <div className="app-grid">
          {results.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";

import { AppCard } from "@/components/app-card";
import { searchApps } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata, truncateMeta } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale, messages: t } = await getI18n();
  const { q = "" } = await searchParams;
  const results = q ? await searchApps(q) : [];
  const href = (path: string) => localizedPath(path, locale);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.searchPage.eyebrow}</p>
          <h1>{t.searchPage.title}</h1>
        </div>
        <form action={href("/search")} className="search-form">
          <input defaultValue={q} name="q" placeholder={t.searchPage.placeholder} />
          <button className="primary-link" type="submit">
            {t.searchPage.submit}
          </button>
        </form>
        {q ? <p className="section-copy">{formatMessage(t.searchPage.results, { count: results.length, query: q })}</p> : null}
        <div className="app-grid">
          {results.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

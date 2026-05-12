import type { Metadata } from "next";
import Link from "next/link";

import { AppCard } from "@/components/app-card";
import { CategoryTabs } from "@/components/category-tabs";
import { HeroCarousel } from "@/components/hero-carousel";
import { localizedFeaturedAppCollections, localizedFeaturedLearnArticles } from "@/lib/content-i18n";
import { getCategorySummaries, getFeaturedApps, listHomeApps } from "@/lib/data";
import { getI18n } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/utils";
import { itemListJsonLd, jsonLdScript, organizationJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "MCP App Store and server directory (mcpapp)",
  description:
    "mcpapp is an MCP app store and MCP server directory for ChatGPT apps and Claude connectors, with categories, previews, tools, and integration details.",
  path: "/",
});

export default async function HomePage() {
  const [{ locale, messages: t }, featuredApps, categories, apps] = await Promise.all([
    getI18n(),
    getFeaturedApps(),
    getCategorySummaries(),
    listHomeApps(),
  ]);
  const href = (path: string) => localizedPath(path, locale);
  const learning = localizedFeaturedLearnArticles(locale);
  const collections = localizedFeaturedAppCollections(locale);

  return (
    <div className="page-stack">
      <header className="header">
        <div className="title-group">
          <h1>
            {t.home.headline} <span className="headline-chip">{t.common.beta}</span>
          </h1>
          <p className="subtitle">
            {t.home.subtitle}
          </p>
        </div>
        <form action={href("/search")} className="search">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" fill="none" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input name="q" placeholder={t.home.searchPlaceholder} type="search" />
        </form>
      </header>
      <HeroCarousel apps={featuredApps} locale={locale} messages={t} />
      <CategoryTabs activeSlug={undefined} categories={categories} locale={locale} messages={t} />
      <section className="home-learn-band" aria-label={t.home.learnAria}>
        <div>
          <p className="eyebrow">{t.home.learnEyebrow}</p>
          <h2>{t.home.learnTitle}</h2>
          <p>{t.home.learnBody}</p>
        </div>
        <div className="home-learn-links">
          {learning.slice(0, 3).map((article) => (
            <Link href={href(`/learn/${article.slug}`)} key={article.slug} prefetch={false}>
              {article.title}
            </Link>
          ))}
        </div>
      </section>
      <section className="home-collection-strip" aria-label={t.home.collectionsAria}>
        <div className="home-collection-copy">
          <p className="eyebrow">{t.home.collectionsEyebrow}</p>
          <h2>{t.home.collectionsTitle}</h2>
          <p>{t.home.collectionsBody}</p>
        </div>
        <div className="home-collection-links">
          {collections.map((collection) => (
            <Link href={href(`/collections/${collection.slug}`)} key={collection.slug} prefetch={false}>
              <span>{collection.eyebrow}</span>
              <strong>{collection.title}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className="grid" aria-label={t.common.appListAria}>
        <div className="app-list">
          {apps.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          organizationJsonLd(),
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MCP App Store",
            alternateName: ["mcpapp", "mcpappstore", "MCPAppStore"],
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl(href("/search"))}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          itemListJsonLd(
            apps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            t.home.appListName,
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
